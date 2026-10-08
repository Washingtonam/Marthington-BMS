import Business from "../businesses/business.model.js";
import Product from "../products/product.model.js";
import ShopCustomer from "./shopCustomer.model.js";
import ShopOrder from "./shopOrder.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import cloudinary from "../../utils/cloudinary.js";
import { verifyPayment } from "../payments/paystack.service.js";
import { initializeShopPayment } from "./shop.paystack.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicCustomer = (customer) => ({
  id: String(customer._id),
  name: customer.name,
  email: customer.email,
  phone: customer.phone || "",
  addresses: customer.addresses || []
});

const customerToken = (customer) => jwt.sign(
  { id: customer._id.toString(), type: "shop_customer" },
  process.env.JWT_SECRET,
  { expiresIn: "30d" }
);

const validateAddress = (address) => {
  const required = ["recipientName", "phone", "addressLine", "city", "state"];
  if (!address || required.some((field) => !String(address[field] || "").trim())) {
    return "Recipient, phone, street address, city, and state are required.";
  }
  return null;
};

const callbackUrl = () => {
  const base = process.env.FRONTEND_URL || "https://bms.marthington.com.ng";
  return `${base.replace(/\/$/, "")}/#/shop/orders`;
};

const releaseReservedStock = async (order) => {
  if (!order.stockReserved) return;
  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product, business: item.business },
      { $inc: { stock: item.quantity } }
    );
  }
  order.stockReserved = false;
};

export const getShopListings = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 48);
    const search = String(req.query.search || "").trim().slice(0, 100);
    const category = String(req.query.category || "").trim().slice(0, 80);

    const activeBusinessFilter = { $or: [{ status: "active" }, { status: { $exists: false } }] };
    const businesses = await Business.find(activeBusinessFilter)
      .select("_id name logo phone supportPhone")
      .lean();
    const businessById = new Map(businesses.map((business) => [String(business._id), business]));

    if (!businesses.length) {
      return res.json({ products: [], categories: [], pagination: { currentPage: page, totalPages: 0, totalProducts: 0 } });
    }

    const filter = {
      business: { $in: businesses.map((business) => business._id) },
      shopVisible: { $ne: false }
    };

    if (category) filter.category = category;
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: expression }, { category: expression }];
    }

    const [totalProducts, products, categoryProducts] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("_id name category price stock business shopImage")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.find({
        business: { $in: businesses.map((business) => business._id) },
        shopVisible: { $ne: false }
      }).distinct("category")
    ]);

    const publicProducts = products.map((product) => {
      const business = businessById.get(String(product.business));
      return {
        id: String(product._id),
        name: product.name,
        category: product.category || "General",
        price: Number(product.price) || 0,
        available: Number(product.stock) > 0,
        canPurchase: Number(product.stock) > 0 && Number(product.price) > 0,
        image: product.shopImage || "",
        business: {
          name: business.name,
          logo: business.logo || "",
          description: ""
        }
      };
    });

    return res.json({
      products: publicProducts,
      categories: categoryProducts.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts
      }
    });
  } catch (error) {
    console.error("GET SHOP LISTINGS ERROR:", error);
    return res.status(500).json({ message: "Could not load shop listings." });
  }
};

export const getShopProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, shopVisible: { $ne: false } })
      .select("_id name category price stock business shopImage")
      .populate({ path: "business", match: { $or: [{ status: "active" }, { status: { $exists: false } }] }, select: "name logo" })
      .lean();
    if (!product?.business) return res.status(404).json({ message: "Product not found in the shop." });
    return res.json({
      product: {
        id: String(product._id),
        name: product.name,
        category: product.category || "General",
        price: Number(product.price) || 0,
        available: Number(product.stock) > 0,
        canPurchase: Number(product.stock) > 0 && Number(product.price) > 0,
        image: product.shopImage || "",
        business: {
          name: product.business.name,
          logo: product.business.logo || "",
          description: ""
        }
      }
    });
  } catch (error) {
    console.error("GET SHOP PRODUCT ERROR:", error);
    return res.status(500).json({ message: "Could not load product details." });
  }
};

export const registerShopCustomer = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").trim();
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ message: "Enter your name, a valid email, and a password of at least 8 characters." });
    }

    const existing = await ShopCustomer.findOne({ email });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const customer = await ShopCustomer.create({
      name,
      email,
      phone,
      password: await bcrypt.hash(password, 12)
    });
    return res.status(201).json({ token: customerToken(customer), customer: publicCustomer(customer) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    console.error("SHOP CUSTOMER REGISTER ERROR:", error);
    return res.status(500).json({ message: "Could not create shop account." });
  }
};

export const loginShopCustomer = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const customer = await ShopCustomer.findOne({ email }).select("+password");
    const passwordValid = customer && await bcrypt.compare(String(req.body.password || ""), customer.password);
    if (!passwordValid || !customer.isActive) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    return res.json({ token: customerToken(customer), customer: publicCustomer(customer) });
  } catch (error) {
    console.error("SHOP CUSTOMER LOGIN ERROR:", error);
    return res.status(500).json({ message: "Could not sign in to shop account." });
  }
};

export const getShopCustomer = (req, res) => res.json({ customer: publicCustomer(req.shopCustomer) });

export const addShopCustomerAddress = async (req, res) => {
  const addressError = validateAddress(req.body);
  if (addressError) return res.status(400).json({ message: addressError });
  try {
    req.shopCustomer.addresses.push({
      label: String(req.body.label || "Delivery").trim(),
      recipientName: String(req.body.recipientName).trim(),
      phone: String(req.body.phone).trim(),
      addressLine: String(req.body.addressLine).trim(),
      city: String(req.body.city).trim(),
      state: String(req.body.state).trim(),
      deliveryNote: String(req.body.deliveryNote || "").trim()
    });
    await req.shopCustomer.save();
    return res.status(201).json({ customer: publicCustomer(req.shopCustomer) });
  } catch (error) {
    console.error("SHOP ADDRESS SAVE ERROR:", error);
    return res.status(500).json({ message: "Could not save delivery address." });
  }
};

export const updateShopCustomerAddress = async (req, res) => {
  const addressError = validateAddress(req.body);
  if (addressError) return res.status(400).json({ message: addressError });
  try {
    const address = req.shopCustomer.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: "Delivery address not found." });
    address.set({
      label: String(req.body.label || "Delivery").trim(),
      recipientName: String(req.body.recipientName).trim(),
      phone: String(req.body.phone).trim(),
      addressLine: String(req.body.addressLine).trim(),
      city: String(req.body.city).trim(),
      state: String(req.body.state).trim(),
      deliveryNote: String(req.body.deliveryNote || "").trim()
    });
    await req.shopCustomer.save();
    return res.json({ customer: publicCustomer(req.shopCustomer) });
  } catch (error) {
    console.error("SHOP ADDRESS UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update delivery address." });
  }
};

export const deleteShopCustomerAddress = async (req, res) => {
  try {
    const address = req.shopCustomer.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: "Delivery address not found." });
    address.deleteOne();
    await req.shopCustomer.save();
    return res.json({ customer: publicCustomer(req.shopCustomer) });
  } catch (error) {
    console.error("SHOP ADDRESS DELETE ERROR:", error);
    return res.status(500).json({ message: "Could not delete delivery address." });
  }
};

export const createShopOrder = async (req, res) => {
  const customer = req.shopCustomer;
  const { items, addressId } = req.body;
  if (!Array.isArray(items) || !items.length || items.length > 50) {
    return res.status(400).json({ message: "Choose between 1 and 50 products." });
  }
  const address = customer.addresses.id(addressId);
  if (!address) return res.status(400).json({ message: "Select or save a delivery address first." });

  const quantities = new Map();
  const expectedPrices = new Map();
  for (const item of items) {
    const id = String(item.productId || "");
    const quantity = Number(item.quantity);
    if (!/^[a-f\d]{24}$/i.test(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return res.status(400).json({ message: "The cart contains an invalid product or quantity." });
    }
    quantities.set(id, (quantities.get(id) || 0) + quantity);
    const expectedPrice = Number(item.expectedPrice);
    if (!Number.isFinite(expectedPrice) || expectedPrice < 0) {
      return res.status(400).json({ message: "Refresh your cart before placing the order." });
    }
    if (expectedPrices.has(id) && expectedPrices.get(id) !== expectedPrice) {
      return res.status(400).json({ message: "The cart has conflicting prices. Refresh your cart before placing the order." });
    }
    expectedPrices.set(id, expectedPrice);
  }
  if ([...quantities.values()].some((quantity) => quantity > 50)) {
    return res.status(400).json({ message: "A product quantity cannot exceed 50." });
  }

  const reserved = [];
  let order;
  try {
    const ids = [...quantities.keys()];
    const products = await Product.find({ _id: { $in: ids }, shopVisible: { $ne: false } }).lean();
    if (products.length !== ids.length) {
      return res.status(409).json({ message: "One or more products are no longer available in the shop." });
    }
    const businesses = await Business.find({
      _id: { $in: products.map((product) => product.business) },
      $or: [{ status: "active" }, { status: { $exists: false } }]
    }).select("_id name phone supportPhone").lean();
    const businessById = new Map(businesses.map((business) => [String(business._id), business]));
    const orderItems = products.map((product) => {
      const business = businessById.get(String(product.business));
      if (!business) {
        const error = new Error("A supplier is no longer active.");
        error.statusCode = 409;
        throw error;
      }
      if (expectedPrices.get(String(product._id)) !== Number(product.price)) {
        const error = new Error("A product price changed. Please review your cart and try again.");
        error.statusCode = 409;
        throw error;
      }
      return {
        product: product._id,
        business: product.business,
        productName: product.name,
        category: product.category || "General",
        quantity: quantities.get(String(product._id)),
        unitPrice: Number(product.price) || 0,
        supplierName: business.name,
        supplierPhone: business.supportPhone || business.phone || ""
      };
    });

    for (const item of orderItems) {
      const update = await Product.updateOne(
        { _id: item.product, business: item.business, shopVisible: { $ne: false }, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (update.modifiedCount !== 1) throw new Error(`Not enough stock for ${item.productName}. Please update your cart.`);
      reserved.push(item);
    }

    const subtotal = orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0) {
      const error = new Error("The order total is invalid.");
      error.statusCode = 400;
      throw error;
    }
    order = await ShopOrder.create({
      orderNumber: `MS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      customer: customer._id,
      customerSnapshot: { name: customer.name, email: customer.email, phone: customer.phone },
      deliveryAddress: {
        recipientName: address.recipientName,
        phone: address.phone,
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        deliveryNote: address.deliveryNote || ""
      },
      items: orderItems,
      subtotal,
      totalPaid: 0,
      paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      stockReserved: true
    });

    const payment = await initializeShopPayment({
      email: customer.email,
      amount: subtotal * 100,
      reference: order.orderNumber,
      callbackUrl: callbackUrl(),
      metadata: { type: "shop_order", orderId: String(order._id), orderNumber: order.orderNumber }
    });
    order.paymentReference = payment.reference;
    await order.save();
    return res.status(201).json({ orderId: order._id, orderNumber: order.orderNumber, authorizationUrl: payment.authorization_url });
  } catch (error) {
    for (const item of reserved) {
      await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
    }
    if (order) {
      order.stockReserved = false;
      order.status = "failed";
      order.paymentStatus = "failed";
      await order.save().catch((saveError) => console.error("SHOP FAILED ORDER SAVE ERROR:", saveError));
    }
    console.error("SHOP ORDER CREATE ERROR:", error);
    return res.status(error.statusCode || (error.message.startsWith("Not enough stock") ? 409 : 500)).json({
      message: error.statusCode ? error.message : error.message.startsWith("Not enough stock")
        ? error.message
        : "Could not create your order. Please try again."
    });
  }
};

export const verifyShopPayment = async (req, res) => {
  const reference = String(req.body.reference || "").trim();
  if (!reference) return res.status(400).json({ message: "Payment reference is required." });
  try {
    const order = await ShopOrder.findOne({ paymentReference: reference, customer: req.shopCustomer._id });
    if (!order) return res.status(404).json({ message: "Order not found for this payment." });
    if (order.paymentStatus === "paid" || order.paymentStatus === "delivery_fee_pending" || order.paymentStatus === "complete") {
      return res.json({ order: publicOrder(order) });
    }
    const payment = await verifyPayment(reference);
    if (
      payment.status !== "success" ||
      payment.currency !== "NGN" ||
      Number(payment.amount) !== order.subtotal * 100 ||
      payment.metadata?.type !== "shop_order" ||
      String(payment.metadata?.orderId) !== String(order._id)
    ) {
      return res.status(400).json({ message: "Payment could not be confirmed for the expected order amount." });
    }
    if (order.status !== "awaiting_payment" || !order.stockReserved) {
      return res.status(409).json({ message: "This order reservation has expired. Contact Marthington support to resolve the payment." });
    }
    const updatedOrder = await processShopPaymentEvent(payment);
    return res.json({ order: publicOrder(updatedOrder) });
  } catch (error) {
    console.error("SHOP PAYMENT VERIFY ERROR:", error);
    return res.status(500).json({ message: "Could not verify payment. Please retry or contact Marthington support." });
  }
};

const publicOrder = (order) => ({
  id: String(order._id),
  orderNumber: order.orderNumber,
  items: order.items.map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice
  })),
  subtotal: order.subtotal,
  deliveryFee: order.deliveryFee,
  totalPaid: order.totalPaid,
  paymentStatus: order.paymentStatus,
  deliveryFeePaymentStatus: order.deliveryFeePaymentStatus,
  status: order.status,
  deliveryAddress: order.deliveryAddress,
  createdAt: order.createdAt
});

export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await ShopOrder.find({ customer: req.shopCustomer._id }).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ orders: orders.map((order) => publicOrder(order)) });
  } catch (error) {
    console.error("SHOP CUSTOMER ORDERS ERROR:", error);
    return res.status(500).json({ message: "Could not load your orders." });
  }
};

export const initializeDeliveryFeePayment = async (req, res) => {
  try {
    const order = await ShopOrder.findOne({ _id: req.params.id, customer: req.shopCustomer._id });
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.deliveryFee <= 0 || order.deliveryFeePaymentStatus !== "pending") {
      return res.status(400).json({ message: "There is no unpaid delivery fee for this order." });
    }
    const reference = `${order.orderNumber}-DEL-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const payment = await initializeShopPayment({
      email: req.shopCustomer.email,
      amount: order.deliveryFee * 100,
      reference,
      callbackUrl: callbackUrl(),
      metadata: { type: "shop_delivery_fee", orderId: String(order._id), orderNumber: order.orderNumber }
    });
    order.deliveryPaymentReference = payment.reference;
    await order.save();
    return res.json({ authorizationUrl: payment.authorization_url, reference: payment.reference });
  } catch (error) {
    console.error("SHOP DELIVERY PAYMENT INIT ERROR:", error);
    return res.status(500).json({ message: "Could not initialize delivery-fee payment." });
  }
};

export const verifyDeliveryFeePayment = async (req, res) => {
  const reference = String(req.body.reference || "").trim();
  try {
    const order = await ShopOrder.findOne({ deliveryPaymentReference: reference, customer: req.shopCustomer._id });
    if (!order) return res.status(404).json({ message: "Delivery fee payment not found." });
    if (order.deliveryFeePaymentStatus === "paid") return res.json({ order: publicOrder(order) });
    const payment = await verifyPayment(reference);
    if (
      payment.status !== "success" ||
      payment.currency !== "NGN" ||
      Number(payment.amount) !== order.deliveryFee * 100 ||
      payment.metadata?.type !== "shop_delivery_fee" ||
      String(payment.metadata?.orderId) !== String(order._id)
    ) {
      return res.status(400).json({ message: "Delivery-fee payment could not be confirmed." });
    }
    const updatedOrder = await processShopPaymentEvent(payment);
    return res.json({ order: publicOrder(updatedOrder) });
  } catch (error) {
    console.error("SHOP DELIVERY PAYMENT VERIFY ERROR:", error);
    return res.status(500).json({ message: "Could not verify delivery-fee payment." });
  }
};

export const processShopPaymentEvent = async (payment) => {
  const metadata = payment?.metadata || {};
  const orderId = String(metadata.orderId || "");
  if (!["shop_order", "shop_delivery_fee"].includes(metadata.type) || !/^[a-f\d]{24}$/i.test(orderId)) {
    throw new Error("Shop payment metadata is invalid.");
  }

  const order = await ShopOrder.findById(orderId);
  if (!order || payment.status !== "success" || payment.currency !== "NGN") {
    throw new Error("Shop payment does not match an active order.");
  }
  if (metadata.type === "shop_order") {
    if (String(payment.reference) !== order.paymentReference || Number(payment.amount) !== order.subtotal * 100) {
      throw new Error("Shop order payment reference or amount does not match.");
    }
    if (["paid", "delivery_fee_pending", "complete"].includes(order.paymentStatus)) return order;
    if (order.status !== "awaiting_payment" || !order.stockReserved) {
      throw new Error("Shop order inventory reservation has expired.");
    }
    order.status = "received";
    order.paymentStatus = "paid";
    order.totalPaid = order.subtotal;
    order.stockReserved = false;
  } else {
    if (String(payment.reference) !== order.deliveryPaymentReference || Number(payment.amount) !== order.deliveryFee * 100) {
      throw new Error("Shop delivery-fee reference or amount does not match.");
    }
    if (order.deliveryFeePaymentStatus === "paid") return order;
    if (order.deliveryFeePaymentStatus !== "pending" || order.deliveryFee <= 0) {
      throw new Error("Shop delivery fee is not awaiting payment.");
    }
    order.deliveryFeePaymentStatus = "paid";
    order.paymentStatus = "complete";
    order.totalPaid += order.deliveryFee;
  }
  await order.save();
  return order;
};

export const getShopAdminProducts = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const search = String(req.query.search || "").trim().slice(0, 100);
    const filter = {};
    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("_id name category price stock business shopVisible shopImage")
        .populate("business", "name status phone supportPhone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);
    return res.json({ products, pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalProducts: total } });
  } catch (error) {
    console.error("SHOP ADMIN PRODUCTS ERROR:", error);
    return res.status(500).json({ message: "Could not load marketplace products." });
  }
};

export const updateShopAdminProduct = async (req, res) => {
  try {
    if (req.body.shopVisible !== undefined && ![true, false, "true", "false"].includes(req.body.shopVisible)) {
      return res.status(400).json({ message: "Shop visibility must be true or false." });
    }
    if (req.file && !req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Upload a valid image." });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (req.file) {
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(base64, { folder: "marthington_shop_products", resource_type: "image" });
      product.shopImage = result.secure_url;
    }
    if (req.body.shopVisible !== undefined) {
      product.shopVisible = req.body.shopVisible === true || req.body.shopVisible === "true";
    }
    await product.save();
    return res.json({ product });
  } catch (error) {
    console.error("SHOP ADMIN PRODUCT UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update marketplace product." });
  }
};

export const getShopAdminOrders = async (req, res) => {
  try {
    const orders = await ShopOrder.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ orders });
  } catch (error) {
    console.error("SHOP ADMIN ORDERS ERROR:", error);
    return res.status(500).json({ message: "Could not load marketplace orders." });
  }
};

export const updateShopAdminOrder = async (req, res) => {
  const allowedStatuses = ["received", "sourcing", "preparing_delivery", "out_for_delivery", "delivered", "cancelled"];
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (req.body.status !== undefined && !allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Choose a valid shop order status." });
    }
    if (req.body.status && allowedStatuses.includes(req.body.status)) {
      if (req.body.status === "cancelled" && order.totalPaid > 0) {
        return res.status(409).json({ message: "This order has been paid. Process and record the refund before cancelling it." });
      }
      if (req.body.status === "cancelled" && order.paymentStatus === "pending") {
        await releaseReservedStock(order);
        order.paymentStatus = "failed";
      }
      order.status = req.body.status;
    }
    if (req.body.adminNote !== undefined) order.adminNote = String(req.body.adminNote).slice(0, 2000);
    if (req.body.deliveryFee !== undefined) {
      const deliveryFee = Number(req.body.deliveryFee);
      if (!Number.isSafeInteger(deliveryFee) || deliveryFee < 0) {
        return res.status(400).json({ message: "Delivery fee must be a non-negative whole number in naira." });
      }
      if (order.deliveryFeePaymentStatus === "paid") {
        order.totalPaid = Math.max(0, order.totalPaid - order.deliveryFee);
      }
      order.deliveryFee = deliveryFee;
      order.deliveryFeePaymentStatus = deliveryFee > 0 ? "pending" : "not_set";
      order.paymentStatus = order.totalPaid >= order.subtotal
        ? (deliveryFee > 0 ? "delivery_fee_pending" : "complete")
        : "pending";
      order.deliveryFeeConfirmedAt = new Date();
      order.deliveryFeeDueAt = deliveryFee > 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
    }
    if (req.body.deliveryFeeMarkedPaid === true && order.deliveryFee > 0 && order.deliveryFeePaymentStatus !== "paid") {
      order.deliveryFeePaymentStatus = "paid";
      order.paymentStatus = "complete";
      order.totalPaid += order.deliveryFee;
    }
    await order.save();
    return res.json({ order });
  } catch (error) {
    console.error("SHOP ADMIN ORDER UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update marketplace order." });
  }
};
