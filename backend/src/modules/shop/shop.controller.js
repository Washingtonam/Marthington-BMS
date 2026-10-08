import Business from "../businesses/business.model.js";
import Product from "../products/product.model.js";
import ShopCustomer from "./shopCustomer.model.js";
import ShopOrder from "./shopOrder.model.js";
import ShopCategory from "./shopCategory.model.js";
import ShopDeliveryArea from "./shopDeliveryArea.model.js";
import Notification from "../notifications/notification.model.js";
import User from "../users/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import cloudinary from "../../utils/cloudinary.js";
import { createRefund, getRefund, verifyPayment } from "../payments/paystack.service.js";
import { initializeShopPayment } from "./shop.paystack.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeCategory = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const resolveShopCategory = (value, categories) => {
  const normalized = normalizeCategory(value);
  const mapped = categories.find((category) =>
    category.sourceCategories.some((source) => normalizeCategory(source) === normalized)
  );
  return mapped?.name || String(value || "General").trim() || "General";
};

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

const refreshShopRefundPaymentStatus = (order) => {
  if (order.totalRefunded >= order.totalPaid && order.totalPaid > 0) {
    order.paymentStatus = "refunded";
  } else if (order.totalRefunded > 0) {
    order.paymentStatus = "partially_refunded";
  } else if (order.deliveryFeePaymentStatus === "pending" && order.totalPaid >= order.subtotal) {
    order.paymentStatus = "delivery_fee_pending";
  } else if (order.totalPaid >= order.subtotal && order.deliveryFeePaymentStatus !== "pending") {
    order.paymentStatus = "complete";
  } else if (order.totalPaid > 0) {
    order.paymentStatus = "paid";
  }
};

export const getShopListings = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 48);
    const search = String(req.query.search || "").trim().slice(0, 100);
    const category = String(req.query.category || "").trim().slice(0, 80);

    const activeBusinessFilter = {
      $and: [
        { $or: [{ status: "active" }, { status: { $exists: false } }] },
        { shopVisible: { $ne: false } }
      ]
    };
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

    const [shopCategories, sourceCategories] = await Promise.all([
      ShopCategory.find().select("name sourceCategories").lean(),
      Product.distinct("category", {
        business: { $in: businesses.map((business) => business._id) },
        shopVisible: { $ne: false }
      })
    ]);

    if (category) {
      const categorySources = sourceCategories.filter((source) =>
        resolveShopCategory(source, shopCategories).toLocaleLowerCase() === category.toLocaleLowerCase()
      );
      filter.category = { $in: categorySources.length ? categorySources : [category] };
    }
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: expression }, { category: expression }];
    }

    const [totalProducts, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("_id name category price stock business shopImage shopFeatured")
        .sort({ shopFeatured: -1, createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const publicProducts = products.map((product) => {
      const business = businessById.get(String(product.business));
      return {
        id: String(product._id),
        name: product.name,
        category: resolveShopCategory(product.category, shopCategories),
        price: Number(product.price) || 0,
        available: Number(product.stock) > 0,
        canPurchase: Number(product.stock) > 0 && Number(product.price) > 0,
        image: product.shopImage || "",
        featured: product.shopFeatured === true,
        business: {
          name: business.name,
          logo: business.logo || "",
          description: ""
        }
      };
    });

    return res.json({
      products: publicProducts,
      categories: [...new Set(sourceCategories.map((source) => resolveShopCategory(source, shopCategories)))]
        .sort((a, b) => a.localeCompare(b)),
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
      .select("_id name category price stock business shopImage shopFeatured")
      .populate({
        path: "business",
        match: {
          $and: [
            { $or: [{ status: "active" }, { status: { $exists: false } }] },
            { shopVisible: { $ne: false } }
          ]
        },
        select: "name logo"
      })
      .lean();
    if (!product?.business) return res.status(404).json({ message: "Product not found in the shop." });
    const shopCategories = await ShopCategory.find().select("name sourceCategories").lean();
    return res.json({
      product: {
        id: String(product._id),
        name: product.name,
        category: resolveShopCategory(product.category, shopCategories),
        price: Number(product.price) || 0,
        available: Number(product.stock) > 0,
        canPurchase: Number(product.stock) > 0 && Number(product.price) > 0,
        image: product.shopImage || "",
        featured: product.shopFeatured === true,
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
      $and: [
        { $or: [{ status: "active" }, { status: { $exists: false } }] },
        { shopVisible: { $ne: false } }
      ]
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
  totalRefunded: order.totalRefunded || 0,
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
    if (["paid", "delivery_fee_pending", "complete", "partially_refunded", "refunded"].includes(order.paymentStatus)) return order;
    if (order.status !== "awaiting_payment" || !order.stockReserved) {
      throw new Error("Shop order inventory reservation has expired.");
    }
    order.status = "received";
    order.totalPaid = order.subtotal;
    order.stockReserved = false;
    refreshShopRefundPaymentStatus(order);
    await order.save();
    await notifyShopAdminsOfPaidOrder(order);
    return order;
  } else {
    if (String(payment.reference) !== order.deliveryPaymentReference || Number(payment.amount) !== order.deliveryFee * 100) {
      throw new Error("Shop delivery-fee reference or amount does not match.");
    }
    if (order.deliveryFeePaymentStatus === "paid") return order;
    if (order.deliveryFeePaymentStatus !== "pending" || order.deliveryFee <= 0) {
      throw new Error("Shop delivery fee is not awaiting payment.");
    }
    order.deliveryFeePaymentStatus = "paid";
    order.totalPaid += order.deliveryFee;
    refreshShopRefundPaymentStatus(order);
  }
  await order.save();
  return order;
};

const notifyShopAdminsOfPaidOrder = async (order) => {
  try {
    const administrators = await User.find({ role: "super_admin", isActive: { $ne: false } })
      .select("_id")
      .lean();
    await Promise.all(administrators.map((administrator) => Notification.updateOne(
      { recipient: administrator._id, type: "shop_order_received", shopOrderId: order._id },
      {
        $setOnInsert: {
          title: "New paid shop order",
          message: `Order ${order.orderNumber} has been paid and is ready for supplier coordination.`,
          shopOrderId: order._id,
          actionUrl: "/admin/shop",
          metadata: { orderNumber: order.orderNumber, subtotal: order.subtotal }
        }
      },
      { upsert: true }
    )));
  } catch (error) {
    console.error("SHOP ORDER ADMIN NOTIFICATION ERROR:", error);
  }
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
        .select("_id name category price stock business shopVisible shopImage shopFeatured")
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
    if (req.body.shopFeatured !== undefined && ![true, false, "true", "false"].includes(req.body.shopFeatured)) {
      return res.status(400).json({ message: "Featured status must be true or false." });
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
    if (req.body.shopFeatured !== undefined) {
      product.shopFeatured = req.body.shopFeatured === true || req.body.shopFeatured === "true";
    }
    await product.save();
    return res.json({ product });
  } catch (error) {
    console.error("SHOP ADMIN PRODUCT UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update marketplace product." });
  }
};

export const getShopAdminCategories = async (req, res) => {
  try {
    const [categories, sourceRows] = await Promise.all([
      ShopCategory.find().sort({ name: 1 }).lean(),
      Product.aggregate([
        { $group: { _id: { $ifNull: ["$category", "General"] }, productsCount: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);
    const groupedSources = new Map();
    for (const row of sourceRows) {
      const sourceCategory = String(row._id || "General").trim() || "General";
      const key = normalizeCategory(sourceCategory);
      const current = groupedSources.get(key) || { sourceCategory, variants: [], productsCount: 0 };
      current.variants.push(sourceCategory);
      current.productsCount += row.productsCount;
      groupedSources.set(key, current);
    }
    const sourceCategories = [...groupedSources.entries()].map(([key, source]) => {
      const mappedCategory = categories.find((category) =>
        category.sourceCategories.some((item) => normalizeCategory(item) === key)
      );
      return { ...source, mappedCategoryId: mappedCategory ? String(mappedCategory._id) : "" };
    }).sort((a, b) => a.sourceCategory.localeCompare(b.sourceCategory));
    return res.json({ categories, sourceCategories });
  } catch (error) {
    console.error("SHOP ADMIN CATEGORIES ERROR:", error);
    return res.status(500).json({ message: "Could not load shop categories." });
  }
};

export const createShopAdminCategory = async (req, res) => {
  const name = String(req.body.name || "").trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) {
    return res.status(400).json({ message: "Category names must contain 1 to 80 characters." });
  }
  try {
    const existing = await ShopCategory.find();
    if (existing.some((category) => normalizeCategory(category.name) === normalizeCategory(name))) {
      return res.status(409).json({ message: "A shop category with this name already exists." });
    }
    const category = await ShopCategory.create({ name });
    return res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A shop category with this name already exists." });
    console.error("SHOP ADMIN CATEGORY CREATE ERROR:", error);
    return res.status(500).json({ message: "Could not create shop category." });
  }
};

export const updateShopAdminCategory = async (req, res) => {
  const name = String(req.body.name || "").trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) {
    return res.status(400).json({ message: "Category names must contain 1 to 80 characters." });
  }
  try {
    const category = await ShopCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Shop category not found." });
    const otherCategories = await ShopCategory.find({ _id: { $ne: category._id } }).select("name");
    if (otherCategories.some((item) => normalizeCategory(item.name) === normalizeCategory(name))) {
      return res.status(409).json({ message: "A shop category with this name already exists." });
    }
    category.name = name;
    await category.save();
    return res.json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A shop category with this name already exists." });
    console.error("SHOP ADMIN CATEGORY UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update shop category." });
  }
};

export const updateShopAdminCategoryMapping = async (req, res) => {
  const sourceCategory = String(req.body.sourceCategory || "").trim().replace(/\s+/g, " ");
  const categoryId = String(req.body.categoryId || "").trim();
  if (!sourceCategory || sourceCategory.length > 80) {
    return res.status(400).json({ message: "Choose a valid BMS category to map." });
  }
  try {
    const categories = await ShopCategory.find();
    const category = categoryId
      ? categories.find((item) => String(item._id) === categoryId)
      : null;
    if (categoryId && !category) return res.status(404).json({ message: "Shop category not found." });
    const normalizedSource = normalizeCategory(sourceCategory);
    for (const item of categories) {
      const sourceValues = item.sourceCategories.filter((value) => normalizeCategory(value) !== normalizedSource);
      if (item === category) sourceValues.push(sourceCategory);
      if (sourceValues.length !== item.sourceCategories.length || item === category) {
        item.sourceCategories = sourceValues;
        await item.save();
      }
    }
    return res.json({ sourceCategory, mappedCategoryId: category ? String(category._id) : "" });
  } catch (error) {
    console.error("SHOP ADMIN CATEGORY MAPPING ERROR:", error);
    return res.status(500).json({ message: "Could not update shop category mapping." });
  }
};

export const getShopAdminBusinesses = async (req, res) => {
  try {
    const [businesses, productCounts] = await Promise.all([
      Business.find({ status: { $ne: "deleted" } })
        .select("_id name status shopVisible")
        .sort({ name: 1 })
        .lean(),
      Product.aggregate([
        { $group: { _id: "$business", productsCount: { $sum: 1 } } }
      ])
    ]);
    const counts = new Map(productCounts.map((item) => [String(item._id), item.productsCount]));
    return res.json({
      businesses: businesses.map((business) => ({
        ...business,
        shopVisible: business.shopVisible !== false,
        productsCount: counts.get(String(business._id)) || 0
      }))
    });
  } catch (error) {
    console.error("SHOP ADMIN BUSINESSES ERROR:", error);
    return res.status(500).json({ message: "Could not load marketplace businesses." });
  }
};

export const updateShopAdminBusiness = async (req, res) => {
  if (![true, false, "true", "false"].includes(req.body.shopVisible)) {
    return res.status(400).json({ message: "Shop visibility must be true or false." });
  }
  try {
    const business = await Business.findById(req.params.id);
    if (!business || business.status === "deleted") {
      return res.status(404).json({ message: "Business not found." });
    }
    business.shopVisible = req.body.shopVisible === true || req.body.shopVisible === "true";
    await business.save();
    return res.json({ business: { id: String(business._id), name: business.name, shopVisible: business.shopVisible } });
  } catch (error) {
    console.error("SHOP ADMIN BUSINESS UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update marketplace business." });
  }
};

const normalizeAreaPart = (value) => String(value || "").trim().replace(/\s+/g, " ");
const deliveryAreaKey = (value) => normalizeAreaPart(value).toLocaleLowerCase();

const validateDeliveryAreaInput = (state, city, fee) => {
  if (!state || state.length > 80 || !city || city.length > 100) {
    return "Enter a state (up to 80 characters) and city/area (up to 100 characters).";
  }
  if (!Number.isSafeInteger(fee) || fee < 0) {
    return "Delivery fee must be a non-negative whole number in naira.";
  }
  return null;
};

export const getShopAdminDeliveryAreas = async (req, res) => {
  try {
    const areas = await ShopDeliveryArea.find().sort({ state: 1, city: 1 }).lean();
    return res.json({ areas });
  } catch (error) {
    console.error("SHOP ADMIN DELIVERY AREAS ERROR:", error);
    return res.status(500).json({ message: "Could not load delivery areas." });
  }
};

export const createShopAdminDeliveryArea = async (req, res) => {
  const state = normalizeAreaPart(req.body.state);
  const city = normalizeAreaPart(req.body.city);
  if (req.body.fee === undefined || String(req.body.fee).trim() === "") {
    return res.status(400).json({ message: "Enter a delivery fee in whole naira." });
  }
  const fee = Number(req.body.fee);
  const validationError = validateDeliveryAreaInput(state, city, fee);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const area = await ShopDeliveryArea.create({
      state,
      city,
      fee,
      stateKey: deliveryAreaKey(state),
      cityKey: deliveryAreaKey(city)
    });
    return res.status(201).json({ area });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A delivery fee is already configured for this state and city." });
    console.error("SHOP ADMIN DELIVERY AREA CREATE ERROR:", error);
    return res.status(500).json({ message: "Could not create delivery area." });
  }
};

export const updateShopAdminDeliveryArea = async (req, res) => {
  try {
    const area = await ShopDeliveryArea.findById(req.params.id);
    if (!area) return res.status(404).json({ message: "Delivery area not found." });
    const state = req.body.state === undefined ? area.state : normalizeAreaPart(req.body.state);
    const city = req.body.city === undefined ? area.city : normalizeAreaPart(req.body.city);
    if (req.body.fee !== undefined && String(req.body.fee).trim() === "") {
      return res.status(400).json({ message: "Enter a delivery fee in whole naira." });
    }
    const fee = req.body.fee === undefined ? area.fee : Number(req.body.fee);
    const validationError = validateDeliveryAreaInput(state, city, fee);
    if (validationError) return res.status(400).json({ message: validationError });
    if (req.body.isActive !== undefined && ![true, false, "true", "false"].includes(req.body.isActive)) {
      return res.status(400).json({ message: "Delivery area status must be true or false." });
    }
    area.state = state;
    area.city = city;
    area.fee = fee;
    area.stateKey = deliveryAreaKey(state);
    area.cityKey = deliveryAreaKey(city);
    if (req.body.isActive !== undefined) area.isActive = req.body.isActive === true || req.body.isActive === "true";
    await area.save();
    return res.json({ area });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A delivery fee is already configured for this state and city." });
    console.error("SHOP ADMIN DELIVERY AREA UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update delivery area." });
  }
};

export const deleteShopAdminDeliveryArea = async (req, res) => {
  try {
    const result = await ShopDeliveryArea.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ message: "Delivery area not found." });
    return res.json({ message: "Delivery area removed." });
  } catch (error) {
    console.error("SHOP ADMIN DELIVERY AREA DELETE ERROR:", error);
    return res.status(500).json({ message: "Could not remove delivery area." });
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

const normalizedRefundStatus = (status) => {
  const value = String(status || "").toLowerCase();
  if (["processed", "success", "successful"].includes(value)) return "processed";
  if (["failed", "abandoned", "reversed"].includes(value)) return "failed";
  return "pending";
};

const reconcileShopRefund = async (orderId, requestKey, providerRefund) => {
  const lockedOrder = await ShopOrder.findOneAndUpdate(
    { _id: orderId, refundInProgress: { $ne: true } },
    { $set: { refundInProgress: true } },
    { new: true }
  ).select("+refundInProgress");
  if (!lockedOrder) {
    const error = new Error("Another refund operation is in progress. Refresh the order and try again.");
    error.statusCode = 409;
    throw error;
  }

  try {
    const refund = lockedOrder.refunds.find((item) => item.requestKey === requestKey);
    if (!refund) {
      const error = new Error("Refund request not found.");
      error.statusCode = 404;
      throw error;
    }
    if (refund.status === "processed") return lockedOrder;

    if (providerRefund?.amount != null && Number(providerRefund.amount) !== refund.amount * 100) {
      const error = new Error("Paystack refund amount does not match the stored refund request.");
      error.statusCode = 409;
      throw error;
    }
    const nextStatus = normalizedRefundStatus(providerRefund?.status);
    refund.paystackRefundId = providerRefund?.id != null ? String(providerRefund.id) : refund.paystackRefundId;
    refund.status = nextStatus;
    refund.error = nextStatus === "failed" ? String(providerRefund?.failure_reason || providerRefund?.message || "Paystack reported that the refund failed.").slice(0, 500) : "";
    if (nextStatus === "processed") {
      refund.processedAt = providerRefund?.processed_at ? new Date(providerRefund.processed_at) : new Date();
      lockedOrder.totalRefunded += refund.amount;
      refreshShopRefundPaymentStatus(lockedOrder);
    }
    await lockedOrder.save();
    return lockedOrder;
  } finally {
    await ShopOrder.updateOne({ _id: orderId }, { $set: { refundInProgress: false } });
    lockedOrder.refundInProgress = false;
  }
};

export const createShopAdminRefund = async (req, res) => {
  const requestedSource = String(req.body.source || "");
  const method = requestedSource === "delivery_fee_manual" ? "manual" : "paystack";
  const source = requestedSource === "delivery_fee_manual" ? "delivery_fee" : requestedSource;
  const amount = Number(req.body.amount);
  const reason = String(req.body.reason || "").trim().slice(0, 300);
  if (!["products", "delivery_fee"].includes(source)) {
    return res.status(400).json({ message: "Choose whether the refund is for products or the delivery fee." });
  }
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(amount * 100)) {
    return res.status(400).json({ message: "Refund amount must be a positive whole number in naira." });
  }
  if (!reason) return res.status(400).json({ message: "Enter a reason for the refund." });
  const externalReference = String(req.body.externalReference || "").trim().slice(0, 120);
  if (method === "manual" && !externalReference) {
    return res.status(400).json({ message: "Enter the reference for the refund already completed outside Paystack." });
  }

  let lockedOrder;
  let refundRequest;
  try {
    lockedOrder = await ShopOrder.findOneAndUpdate(
      { _id: req.params.id, refundInProgress: { $ne: true } },
      { $set: { refundInProgress: true } },
      { new: true }
    ).select("+refundInProgress");
    if (!lockedOrder) {
      const existingOrder = await ShopOrder.exists({ _id: req.params.id });
      return res.status(existingOrder ? 409 : 404).json({
        message: existingOrder ? "Another refund operation is in progress. Refresh the order and try again." : "Order not found."
      });
    }

    if (lockedOrder.status === "cancelled" || lockedOrder.status === "awaiting_payment" || lockedOrder.status === "expired" || lockedOrder.status === "failed") {
      return res.status(409).json({ message: "Only paid, active orders can be refunded." });
    }
    if (lockedOrder.refunds.some((refund) => ["initializing", "pending"].includes(refund.status))) {
      return res.status(409).json({ message: "Resolve the existing pending refund before requesting another refund." });
    }

    const transactionReference = method === "manual"
      ? ""
      : source === "products"
        ? lockedOrder.paymentReference
        : lockedOrder.deliveryPaymentReference;
    const paidAmount = source === "products"
      ? (lockedOrder.totalPaid > 0 ? lockedOrder.subtotal : 0)
      : (lockedOrder.deliveryFeePaymentStatus === "paid" ? lockedOrder.deliveryFee : 0);
    if (paidAmount <= 0 || (method === "paystack" && !transactionReference)) {
      return res.status(409).json({
        message: source === "products"
          ? "The product payment has no Paystack reference to refund."
          : "The delivery fee has not been paid."
      });
    }
    if (method === "manual" && (source !== "delivery_fee" || lockedOrder.deliveryPaymentReference)) {
      return res.status(409).json({ message: "Manual refund records are only for delivery fees marked paid outside Paystack." });
    }

    const alreadyRefunded = lockedOrder.refunds
      .filter((refund) => refund.source === source && refund.status === "processed")
      .reduce((total, refund) => total + refund.amount, 0);
    const refundable = paidAmount - alreadyRefunded;
    if (amount > refundable) {
      return res.status(400).json({ message: `The maximum refundable amount for this payment is ₦${Math.max(0, refundable).toLocaleString()}.` });
    }

    refundRequest = {
      requestKey: crypto.randomBytes(16).toString("hex"),
      source,
      method,
      transactionReference,
      externalReference,
      amount,
      status: method === "manual" ? "processed" : "initializing",
      reason,
      requestedBy: req.user._id || req.user.id,
      requestedAt: new Date(),
      processedAt: method === "manual" ? new Date() : null
    };
    lockedOrder.refunds.push(refundRequest);
    if (method === "manual") {
      lockedOrder.totalRefunded += amount;
      refreshShopRefundPaymentStatus(lockedOrder);
      await lockedOrder.save();
      lockedOrder.refundInProgress = false;
      return res.json({
        message: "Manual refund recorded. Confirm the external refund was completed before cancelling the order.",
        order: lockedOrder.toObject(),
        refund: lockedOrder.refunds.find((item) => item.requestKey === refundRequest.requestKey)
      });
    }
    await lockedOrder.save();
    const requestKey = refundRequest.requestKey;
    lockedOrder.refundInProgress = false;
    await lockedOrder.save();

    let providerRefund;
    try {
      providerRefund = await createRefund({
        transaction: transactionReference,
        amount: amount * 100,
        merchantNote: `${lockedOrder.orderNumber}: ${reason}`,
        customerNote: `Refund for Marthington Shop order ${lockedOrder.orderNumber}`
      });
    } catch (providerError) {
      const definitiveFailure = providerError.statusCode >= 400 && providerError.statusCode < 500;
      await reconcileShopRefund(lockedOrder._id, requestKey, definitiveFailure
        ? { status: "failed", failure_reason: providerError.message }
        : { status: "pending", message: providerError.message });
      if (!definitiveFailure) {
        return res.status(202).json({
          message: "Paystack's response is not confirmed. This refund is reserved as pending; check Paystack before retrying.",
          order: await ShopOrder.findById(lockedOrder._id).lean()
        });
      }
      return res.status(502).json({ message: `Paystack did not accept the refund: ${providerError.message}` });
    }

    const order = await reconcileShopRefund(lockedOrder._id, requestKey, providerRefund);
    const refund = order.refunds.find((item) => item.requestKey === requestKey);
    return res.status(refund.status === "processed" ? 200 : 202).json({
      message: refund.status === "processed" ? "Refund processed by Paystack." : "Refund request submitted to Paystack and is pending.",
      order: order.toObject(),
      refund
    });
  } catch (error) {
    console.error("SHOP ADMIN REFUND CREATE ERROR:", error);
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Could not process the shop refund." });
  } finally {
    if (lockedOrder) {
      await ShopOrder.updateOne({ _id: lockedOrder._id }, { $set: { refundInProgress: false } }).catch((error) => {
        console.error("SHOP REFUND LOCK RELEASE ERROR:", error);
      });
      lockedOrder.refundInProgress = false;
    }
  }
};

export const refreshShopAdminRefund = async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    const refund = order.refunds.find((item) => item.requestKey === req.params.requestKey);
    if (!refund) return res.status(404).json({ message: "Refund request not found." });
    if (refund.status === "processed" || refund.status === "failed") {
      return res.json({ order, refund });
    }
    if (!refund.paystackRefundId) {
      return res.status(409).json({ message: "Paystack did not return a refund ID. Verify the transaction in Paystack before taking further action." });
    }
    const providerRefund = await getRefund(refund.paystackRefundId);
    const updatedOrder = await reconcileShopRefund(order._id, refund.requestKey, providerRefund);
    const updatedRefund = updatedOrder.refunds.find((item) => item.requestKey === refund.requestKey);
    return res.json({ order: updatedOrder, refund: updatedRefund });
  } catch (error) {
    console.error("SHOP ADMIN REFUND REFRESH ERROR:", error);
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Could not refresh the Paystack refund status." });
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
      if (req.body.status === "cancelled" && (order.totalRefunded || 0) < order.totalPaid) {
        return res.status(409).json({ message: "Refund the full amount paid through Paystack before cancelling this order." });
      }
      if (req.body.status === "cancelled" && order.paymentStatus === "pending") {
        await releaseReservedStock(order);
        order.paymentStatus = "failed";
      }
      order.status = req.body.status;
    }
    if (req.body.adminNote !== undefined) order.adminNote = String(req.body.adminNote).slice(0, 2000);
    if (req.body.deliveryAreaName !== undefined) {
      order.deliveryAreaName = String(req.body.deliveryAreaName).trim().slice(0, 200);
    }
    if (req.body.deliveryFee !== undefined) {
      const deliveryFee = Number(req.body.deliveryFee);
      if (!Number.isSafeInteger(deliveryFee) || deliveryFee < 0) {
        return res.status(400).json({ message: "Delivery fee must be a non-negative whole number in naira." });
      }
      if (
        deliveryFee !== order.deliveryFee &&
        (order.deliveryFeePaymentStatus === "paid" || order.refunds.some((refund) => refund.source === "delivery_fee"))
      ) {
        return res.status(409).json({ message: "A paid or refunded delivery fee cannot be changed." });
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
      order.totalPaid += order.deliveryFee;
    }
    refreshShopRefundPaymentStatus(order);
    await order.save();
    return res.json({ order });
  } catch (error) {
    console.error("SHOP ADMIN ORDER UPDATE ERROR:", error);
    return res.status(500).json({ message: "Could not update marketplace order." });
  }
};
