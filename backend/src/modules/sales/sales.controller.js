import Sale from "./sale.model.js";
import Product from "../products/product.model.js";
import Business from "../businesses/business.model.js";
import Customer from "../customers/customer.model.js";
import InventoryMovement from "../inventory/inventory.model.js";

// 🔥 GENERATE RECEIPT ID
const generateReceiptId = () => {
  return Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase();
};


// 🔥 CREATE SALE
const createSale = async (req, res) => {
  try {

    const {
      items,
      autoSend,
      customerName,
      customerPhone,
      notes
    } = req.body;

   const business = await Business.findById(
      req.user.businessId
    );

    const isPro =
      business?.subscription?.status === "active";
    if (autoSend && !isPro) {
      return res.status(403).json({
        message:
          "Auto WhatsApp is a Pro feature"
      });
    }

    let customer = null;

    if (customerPhone) {

      customer =
        await Customer.findOne({

          business:
            req.user.businessId,

          phone:
            customerPhone
        });

      if (!customer) {

        customer =
          await Customer.create({

            business:
              req.user.businessId,

            name:
              customerName ||
              "Walk-in Customer",

            phone:
              customerPhone
          });
      }
    }

    let totalAmount = 0;

    const saleItems = [];

    for (const item of items) {

      // =========================
      // 🔥 PRODUCT SALES
      // =========================
      if (
        item.itemType === "product" ||
        !item.itemType
      ) {

        const product =
          await Product.findById(
            item.product
          );

        if (!product) {
          return res.status(404).json({
            message: "Product not found"
          });
        }

        // 🔥 BUSINESS SECURITY
        if (
          req.user.role !== "super_admin" &&
          product.business.toString() !==
            req.user.businessId
        ) {
          return res.status(403).json({
            message:
              "Unauthorized product access"
          });
        }

        // 🔥 STOCK CHECK
        if (
          product.stock < item.quantity
        ) {
          return res.status(400).json({
            message:
              `Not enough stock for ${product.name}`
          });
        }

        const basePrice =
          Math.round(
            Number(product.price)
          );

        const incomingPrice =
          Math.round(
            Number(
              item.sellingPrice ??
              product.price
            )
          );

        let finalPrice = basePrice;

        const canOverride =
          req.user.role === "owner" ||
          req.user.role === "super_admin" ||
          req.user.permissions
            ?.canOverridePrice;

        if (
          incomingPrice !== basePrice
        ) {
          if (!canOverride) {
            return res.status(403).json({
              message:
                "You cannot override price"
            });
          }

          finalPrice = incomingPrice;
        }

        const quantity =
          Math.round(
            Number(item.quantity)
          );

        const itemTotal =
          finalPrice * quantity;

        totalAmount += itemTotal;

        // 🔥 REDUCE STOCK
        product.stock -= quantity;

        await product.save();

        // 🔥 LOG INVENTORY MOVEMENT
        await InventoryMovement.create({

          business:
            req.user.businessId,

          product:
            product._id,

          type: "sale",

          quantity:
            quantity,

          previousStock:
            product.stock + quantity,

          newStock:
            product.stock,

          createdBy:
            req.user.id
        });

        saleItems.push({
          itemType: "product",

          product: product._id,

          name: product.name,

          quantity,

          costPrice:
            Number(product.costPrice) || 0,

          sellingPrice: finalPrice,

          total: itemTotal
        });
      }

      // =========================
      // 🔥 SERVICE SALES
      // =========================
      else if (
        item.itemType === "service"
      ) {

        const quantity =
          Math.round(
            Number(item.quantity || 1)
          );

        const sellingPrice =
          Math.round(
            Number(item.sellingPrice || 0)
          );

        const itemTotal =
          quantity * sellingPrice;

        totalAmount += itemTotal;

        saleItems.push({
          itemType: "service",

          serviceName:
            item.name || "Service",

          name:
            item.name || "Service",

          quantity,

          costPrice: 0,

          sellingPrice,

          total: itemTotal
        });
      }
    }

    // 🔥 CREATE SALE
    const sale = await Sale.create({

      items: saleItems,

      totalAmount,

      business:
        req.user.businessId,

      createdBy:
        req.user.id,

      customer:
        customer?._id || null,

      customerName:
        customerName || "",

      customerPhone:
        customerPhone || "",

      notes:
        notes || "",

      receiptId:
        generateReceiptId()
    });

    if (customer) {

      customer.totalSpent +=
        totalAmount;

      customer.totalOrders += 1;

      customer.lastPurchaseAt =
        new Date();

      customer.loyaltyPoints +=
        Math.floor(
          totalAmount / 1000
        );

      await customer.save();
    }

    res.json({
      message: "Sale completed",
      sale
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};




// 🔥 GET ALL SALES
const getSales = async (
  req,
  res
) => {
  try {

    let query = {};

    if (
      req.user.role !==
      "super_admin"
    ) {
      query.business =
        req.user.businessId;
    }

    const sales = await Sale.find(
      query
    )
      .sort({
        createdAt: -1
      })

      .populate(
        "createdBy",
        "name"
      )

      .populate(
        "items.product",
        "name price"
      )

      .populate(
      "business",
      `
        name
        address
        phone
        email
        receiptFooter
        receiptTheme
        logo
        subscription
      `
    );

    res.json(sales);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


// 🔥 GET SINGLE SALE
const getSaleById = async (
  req,
  res
) => {
  try {

    const sale =
      await Sale.findById(
        req.params.id
      )

        .populate(
          "createdBy",
          "name"
        )

        .populate(
          "items.product",
          "name price"
        )

        .populate(
          "business",
          "name address phone email receiptFooter receiptTheme logo subscription"
        );

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found"
      });
    }

    if (
      req.user.role !==
        "super_admin" &&
      sale.business._id.toString() !==
        req.user.businessId
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    res.json(sale);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


// 🔥 PUBLIC RECEIPT
const getPublicSale = async (
  req,
  res
) => {
  try {

    const { id } = req.params;

    const sale =
      await Sale.findOne({
        $or: [
          { _id: id },
          { receiptId: id }
        ]
      })

        .populate(
          "items.product",
          "name price"
        )

        .populate(
          "business",
          `
            name
            address
            phone
            email
            receiptFooter
            receiptTheme
            logo
            subscription
          `
        );

    if (!sale) {
      return res.status(404).json({
        message: "Receipt not found"
      });
    }

    res.json(sale);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


export default {
  createSale,
  getSales,
  getSaleById,
  getPublicSale
};