import mongoose from "mongoose";
import Invoice from "./invoice.model.js";
import InvoiceCounter from "./invoiceCounter.model.js";
import Product from "../products/product.model.js";
import Service from "../services/service.model.js";
import Customer from "../customers/customer.model.js";
import Supplier from "../suppliers/supplier.model.js";
import InventoryMovement from "../inventory/inventory.model.js";
import BranchInventory from "../branches/branchInventory.model.js";
import Payment from "../payments/payment.model.js";
import Sale from "../sales/sale.model.js";
import Transaction from "../transactions/transaction.model.js";
import EmailHistory from "../../models/emailHistory.model.js";
import { sendInvoiceCreatedEmail, sendPaymentReceivedEmail, sendInvoiceSharedEmail } from "../../utils/emailService.js";
import { getOutgoingStockDelta, validateOutgoingStockAvailability } from "./invoice.stock.js";
import { canAccessBranch, getScopedBranchQuery, resolveOperationalBranchId } from "../../utils/branchAccess.js";
import { buildSaleLedgerEntry } from "../sales/sales.utils.js";

const generateInvoiceNumber = async (businessId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  let counter = await InvoiceCounter.findOne({ business: businessId });

  if (!counter) {
    counter = await InvoiceCounter.create({
      business: businessId,
      lastNumber: 0,
      prefix: "INV"
    });
  }

  // Increment counter
  counter.lastNumber += 1;
  await counter.save();

  // Format: INV-2024-01-000001
  const invoiceNumber = `${counter.prefix}-${year}-${month}-${String(counter.lastNumber).padStart(6, "0")}`;

  return invoiceNumber;
};

const calculatePaymentStatus = ({ totalAmount, amountPaid, returnedAmount = 0 }) => {
  const effectiveTotal = Math.max(0, totalAmount - returnedAmount);

  if (returnedAmount > 0 && amountPaid === 0 && effectiveTotal === 0) {
    return "Returned";
  }

  if (amountPaid >= effectiveTotal && effectiveTotal > 0) {
    return "Fully Paid";
  }

  if (amountPaid > 0 && amountPaid < effectiveTotal) {
    return "Partially Paid";
  }

  return "Unpaid";
};

const hasInvoiceBranchAccess = (invoice, user, action = "view") =>
  canAccessBranch(user, invoice?.branch?.toString() || null, action);

const createInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      transactionType = "outgoing",
      customer,
      supplier,
      customerName,
      customerPhone,
      customerEmail,
      items = [],
      tax,
      discount,
      amountPaid = 0,
      dueDate,
      notes,
      invoiceType,
      branch
    } = req.body;

    const businessId = req.user.businessId;
    const branchId = resolveOperationalBranchId({ user: req.user, requestedBranchId: branch });
    if (branchId === undefined) {
      throw new Error("You can only create invoices for your assigned branch unless cross-branch management is enabled.");
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalAmount = subtotal + Number(tax || 0) - Number(discount || 0);
    const returnedAmount = 0;
    const numericAmountPaid = Number(amountPaid || 0);
    if (!Number.isFinite(numericAmountPaid) || numericAmountPaid < 0 || numericAmountPaid > totalAmount) {
      throw new Error("Initial payment must be between zero and the invoice total.");
    }
    const balanceDue = Math.max(0, totalAmount - numericAmountPaid);
    const paymentStatus = calculatePaymentStatus({ totalAmount, amountPaid: numericAmountPaid, returnedAmount });

    if (transactionType === "incoming" && !supplier) {
      throw new Error("Supplier must be provided for incoming supplier invoices.");
    }

    if (transactionType === "outgoing" && customer) {
      const customerRecord = await Customer.findOne({ _id: customer, business: businessId }).session(session);
      if (!customerRecord) throw new Error("Customer record not found for outgoing customer invoice.");
    }

    const processedItems = [];
    const invoiceNumber = await generateInvoiceNumber(businessId);

    if (transactionType === "outgoing") {
      const productAvailability = {};
      for (const item of items) {
        if (!item || !item.product) continue;

        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new Error(`Product not found for sale item: ${item.name || "Unknown product"}`);
        }

        if (branchId) {
          const branchInventory = await BranchInventory.findOne({
            business: businessId,
            branch: branchId,
            product: product._id
          }).session(session);

          productAvailability[String(product._id)] = branchInventory ? Number(branchInventory.quantity || 0) : 0;
        } else {
          productAvailability[String(product._id)] = Number(product.stock || 0);
        }
      }

      const availabilityCheck = validateOutgoingStockAvailability(productAvailability, items);
      if (!availabilityCheck.ok) {
        const issue = availabilityCheck.issues[0];
        throw new Error(`Insufficient stock for product ${issue.product}. Available: ${issue.available}, Requested: ${issue.required}`);
      }
    }

    for (const item of items) {
      const invoiceItem = {
        product: item.product || null,
        service: item.service || null,
        name: item.name,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        total: Number(item.total || 0),
        returned: false,
        returnQuantity: 0,
        returnAmount: 0,
        receivedQuantity: transactionType === "incoming" ? Number(item.quantity || 0) : 0,
        soldQuantity: 0,
        supplierCreditStatus: transactionType === "incoming"
          ? (balanceDue === 0 ? "Fully Paid" : numericAmountPaid > 0 ? "Partially Paid" : "Unpaid")
          : null,
        supplierBatchLabel: transactionType === "incoming"
          ? `Supplier Credit - ${balanceDue === 0 ? "Fully Paid" : numericAmountPaid > 0 ? "Partially Paid" : "Unpaid"}`
          : ""
      };

      if (item.service) {
        const service = await Service.findOne({ _id: item.service, business: businessId }).session(session);
        if (!service) {
          throw new Error(`Service not found for invoice item: ${item.name || "Unknown service"}`);
        }
      }

      if (transactionType === "incoming" && item.product) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new Error(`Product not found for supplier item: ${item.name}`);
        }

        if (branchId) {
          const branchInventory = await BranchInventory.findOne({
            business: businessId,
            branch: branchId,
            product: product._id
          }).session(session);

          const previousStock = branchInventory ? branchInventory.quantity : 0;
          await BranchInventory.findOneAndUpdate(
            { business: businessId, branch: branchId, product: product._id },
            {
              $setOnInsert: {
                business: businessId,
                branch: branchId,
                product: product._id,
                createdBy: req.user.id
              },
              $inc: { quantity: invoiceItem.quantity }
            },
            { upsert: true, new: true, session }
          );

          await InventoryMovement.create(
            [
              {
                business: businessId,
                branch: branchId,
                product: product._id,
                type: "purchase",
                quantity: invoiceItem.quantity,
                previousStock,
                newStock: previousStock + invoiceItem.quantity,
                note: "Supplier credit received",
                createdBy: req.user.id
              }
            ],
            { session }
          );
        } else {
          const previousStock = product.stock;
          product.stock += invoiceItem.quantity;
          await product.save({ session });

          await InventoryMovement.create(
            [
              {
                business: businessId,
                product: product._id,
                type: "purchase",
                quantity: invoiceItem.quantity,
                previousStock,
                newStock: product.stock,
                note: "Supplier credit received",
                createdBy: req.user.id
              }
            ],
            { session }
          );
        }
      }

      processedItems.push(invoiceItem);
    }

    const invoice = await Invoice.create(
      [
        {
          business: businessId,
          branch: branchId,
          createdBy: req.user.id,
          transactionType,
          customer,
          supplier,
          customerName,
          customerPhone,
          customerEmail,
          items: processedItems,
          subtotal,
          tax,
          discount,
          totalAmount,
          amountPaid: numericAmountPaid,
          balance: balanceDue,
          balanceDue,
          returnedAmount,
          paymentStatus,
          status: balanceDue === 0 ? "paid" : numericAmountPaid > 0 ? "partial" : "draft",
          dueDate,
          notes,
          invoiceType,
          invoiceNumber,
          fulfillmentStatus: transactionType === "outgoing" ? "pending_pickup" : "not_applicable"
        }
      ],
      { session }
    );

    const createdInvoice = invoice[0];

    if (transactionType === "outgoing" && customer) {
      const customerRecord = await Customer.findOne({ _id: customer, business: businessId }).session(session);
      if (customerRecord) {
        customerRecord.outstandingBalance += balanceDue;
        await customerRecord.save({ session });
      }
    }

    if (transactionType === "incoming" && supplier) {
      const supplierRecord = await Supplier.findOne({ _id: supplier, business: businessId }).session(session);
      if (!supplierRecord) {
        throw new Error("Supplier record not found for incoming supplier invoice.");
      }
      supplierRecord.totalPurchases = Number(supplierRecord.totalPurchases || 0) + totalAmount;
      supplierRecord.outstandingBalance = Number(supplierRecord.outstandingBalance || 0) + balanceDue;
      await supplierRecord.save({ session });
    }

    if (numericAmountPaid > 0) {
      await Payment.create([{
        business: businessId,
        invoice: createdInvoice._id,
        paymentMethod: "other",
        amount: numericAmountPaid,
        notes: "Initial payment recorded with invoice creation",
        createdBy: req.user.id,
        status: "confirmed"
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    const populatedInvoice = await Invoice.findById(createdInvoice._id)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive")
      .populate("business", "name email");

    // 📧 Send invoice created email (non-blocking)
    if (transactionType === "outgoing" && customerEmail) {
      setImmediate(() => {
        sendInvoiceCreatedEmail({
          recipientEmail: customerEmail,
          recipientName: customerName || "Valued Customer",
          businessName: populatedInvoice.business?.name || "Our Business",
          businessId: req.user.businessId,
          invoiceId: createdInvoice._id,
          invoiceNumber: invoiceNumber,
          customerName: customerName,
          amount: `$${totalAmount.toFixed(2)}`,
          dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : "No due date",
          invoiceUrl: `${process.env.FRONTEND_URL}/invoices/${createdInvoice._id}`,
          createdBy: req.user.id
        }).catch(err => console.error("Email sending error:", err));
      });
    }

    res.json(populatedInvoice);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

const returnInvoiceItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { invoiceId } = req.params;
    const { itemId, returnQuantity = 0, reason = "Customer return" } = req.body;
    const invoice = await Invoice.findOne({ _id: invoiceId, business: req.user.businessId }).session(session);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!hasInvoiceBranchAccess(invoice, req.user, "manage")) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    if (invoice.transactionType !== "outgoing") {
      return res.status(400).json({ message: "Returns can only be processed against outgoing customer invoices." });
    }

    const item = invoice.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Invoice item not found" });
    }

    const availableReturn = item.quantity - item.returnQuantity;
    if (returnQuantity <= 0 || returnQuantity > availableReturn) {
      return res.status(400).json({ message: "Invalid return quantity." });
    }

    const returnAmount = returnQuantity * item.price;
    item.returned = true;
    item.returnQuantity += returnQuantity;
    item.returnAmount += returnAmount;

    invoice.returnedAmount += returnAmount;
    invoice.balanceDue = Math.max(0, invoice.balanceDue - returnAmount);
    invoice.balance = invoice.balanceDue;
    invoice.paymentStatus = calculatePaymentStatus({
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      returnedAmount: invoice.returnedAmount
    });

    if (item.product) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        if (invoice.branch) {
          const branchInventory = await BranchInventory.findOne({
            business: req.user.businessId,
            branch: invoice.branch,
            product: product._id
          }).session(session);

          const previousStock = branchInventory ? branchInventory.quantity : 0;
          await BranchInventory.findOneAndUpdate(
            { business: req.user.businessId, branch: invoice.branch, product: product._id },
            {
              $setOnInsert: {
                business: req.user.businessId,
                branch: invoice.branch,
                product: product._id,
                createdBy: req.user.id
              },
              $inc: { quantity: returnQuantity }
            },
            { upsert: true, new: true, session }
          );

          await InventoryMovement.create(
            [
              {
                business: req.user.businessId,
                branch: invoice.branch,
                product: product._id,
                type: "return",
                quantity: returnQuantity,
                previousStock,
                newStock: previousStock + returnQuantity,
                note: `Returned from invoice ${invoice._id}: ${reason}`,
                createdBy: req.user.id
              }
            ],
            { session }
          );
        } else {
          const previousStock = product.stock;
          product.stock += returnQuantity;
          await product.save({ session });

          await InventoryMovement.create(
            [
              {
                business: req.user.businessId,
                product: product._id,
                type: "return",
                quantity: returnQuantity,
                previousStock,
                newStock: product.stock,
                note: `Returned from invoice ${invoice._id}: ${reason}`,
                createdBy: req.user.id
              }
            ],
            { session }
          );
        }
      }
    }

    if (invoice.customer) {
      const customerRecord = await Customer.findOne({ _id: invoice.customer, business: req.user.businessId }).session(session);
      if (customerRecord) {
        customerRecord.outstandingBalance = Math.max(0, customerRecord.outstandingBalance - returnAmount);
        await customerRecord.save({ session });
      }
    }

    await invoice.save({ session });
    await session.commitTransaction();
    session.endSession();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive");

    res.json(populatedInvoice);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

const finalizeInvoiceStockDeduction = async ({ invoice, userId, session }) => {
  if (invoice.transactionType !== "outgoing") return;

  const byProduct = new Map();
  for (const item of invoice.items || []) {
    if (!item || !item.product) continue;

    const productId = String(item.product);
    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) continue;
    byProduct.set(productId, (byProduct.get(productId) || 0) + quantity);
  }

  if (byProduct.size === 0) return;

  for (const [productId, quantity] of byProduct.entries()) {
    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error(`Product not found for invoice item ${productId}`);
    }

    if (invoice.branch) {
      const branchInventory = await BranchInventory.findOne({
        business: invoice.business,
        branch: invoice.branch,
        product: product._id
      }).session(session);

      const availableStock = branchInventory ? Number(branchInventory.quantity || 0) : 0;
      if (availableStock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${quantity}`);
      }

      const previousStock = availableStock;
      await BranchInventory.findOneAndUpdate(
        { business: invoice.business, branch: invoice.branch, product: product._id },
        { $inc: { quantity: -quantity } },
        { session }
      );

      await InventoryMovement.create(
        [{
          business: invoice.business,
          branch: invoice.branch,
          product: product._id,
          type: "sale",
          quantity,
          previousStock,
          newStock: previousStock - quantity,
          note: `Invoice finalized: ${invoice.invoiceNumber}`,
          createdBy: userId
        }],
        { session }
      );
    } else {
      const availableStock = Number(product.stock || 0);
      if (availableStock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${quantity}`);
      }

      const previousStock = availableStock;
      product.stock = previousStock - quantity;
      await product.save({ session });

      await InventoryMovement.create(
        [{
          business: invoice.business,
          product: product._id,
          type: "sale",
          quantity,
          previousStock,
          newStock: product.stock,
          note: `Invoice finalized: ${invoice.invoiceNumber}`,
          createdBy: userId
        }],
        { session }
      );
    }
  }
};

const generatePickupReceiptId = () => `PICKUP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const completeInvoicePickup = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      business: req.user.businessId
    }).session(session);

    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!hasInvoiceBranchAccess(invoice, req.user, "manage")) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    if (invoice.transactionType !== "outgoing") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Only customer invoices can be completed as pickups" });
    }

    if (invoice.fulfillmentStatus === "collected" || invoice.linkedSale) {
      const existingSale = invoice.linkedSale ? await Sale.findById(invoice.linkedSale).session(session) : null;
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: "This invoice has already been collected", sale: existingSale });
    }

    if (invoice.fulfillmentStatus === "cancelled") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Cancelled invoices cannot be collected" });
    }

    const saleItems = [];
    for (const item of invoice.items || []) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      if (item.product) {
        const product = await Product.findById(item.product).session(session);
        if (!product) throw new Error(`Product not found for invoice item ${item.name}`);

        if (invoice.branch) {
          const inventory = await BranchInventory.findOneAndUpdate(
            { business: invoice.business, branch: invoice.branch, product: product._id, quantity: { $gte: quantity } },
            { $inc: { quantity: -quantity } },
            { new: true, session }
          );
          if (!inventory) throw new Error(`Insufficient branch stock for ${product.name}`);
          const previousStock = Number(inventory.quantity || 0) + quantity;
          await InventoryMovement.create([{
            business: invoice.business,
            branch: invoice.branch,
            product: product._id,
            type: "sale",
            quantity,
            previousStock,
            newStock: Number(inventory.quantity || 0),
            note: `Invoice pickup: ${invoice.invoiceNumber}`,
            createdBy: req.user.id
          }], { session });
        } else {
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: product._id, business: invoice.business, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true, session }
          );
          if (!updatedProduct) throw new Error(`Insufficient stock for ${product.name}`);
          await InventoryMovement.create([{
            business: invoice.business,
            product: product._id,
            type: "sale",
            quantity,
            previousStock: Number(updatedProduct.stock || 0) + quantity,
            newStock: Number(updatedProduct.stock || 0),
            note: `Invoice pickup: ${invoice.invoiceNumber}`,
            createdBy: req.user.id
          }], { session });
        }

        saleItems.push({
          itemType: "product",
          product: product._id,
          name: item.name || product.name,
          quantity,
          costPrice: Number(product.costPrice || 0),
          sellingPrice: Number(item.price || 0),
          total: Number(item.total || 0)
        });
      } else {
        saleItems.push({
          itemType: "service",
          name: item.name,
          quantity,
          costPrice: 0,
          sellingPrice: Number(item.price || 0),
          total: Number(item.total || 0)
        });
      }
    }

    if (!saleItems.length) throw new Error("Invoice has no collectible items");

    const sale = await Sale.create([{
      items: saleItems,
      totalAmount: Number(invoice.totalAmount || 0),
      paymentMethod: Number(invoice.balanceDue || 0) > 0 ? "credit" : "other",
      paymentStatus: "verified",
      business: invoice.business,
      branch: invoice.branch,
      createdBy: req.user.id,
      customer: invoice.customer,
      customerName: invoice.customerName || "Walk-in",
      customerPhone: invoice.customerPhone || "",
      invoice: invoice._id,
      receiptId: generatePickupReceiptId(),
      status: "posted"
    }], { session }).then(result => result[0]);

    invoice.fulfillmentStatus = "collected";
    invoice.fulfilledAt = new Date();
    invoice.fulfilledBy = req.user.id;
    invoice.linkedSale = sale._id;
    invoice.stockFinalized = true;
    for (const item of invoice.items || []) item.soldQuantity = item.quantity;
    await invoice.save({ session });

    await Transaction.create([
      buildSaleLedgerEntry({
        sale,
        businessId: invoice.business,
        createdBy: req.user.id,
        status: "posted",
        notePrefix: "Invoice pickup"
      })
    ], { session });

    if (invoice.customer) {
      await Customer.findOneAndUpdate(
        { _id: invoice.customer, business: invoice.business },
        {
          $inc: {
            totalSpent: invoice.totalAmount,
            totalOrders: 1,
            loyaltyPoints: Math.floor(Number(invoice.totalAmount || 0) / 1000)
          },
          $set: { lastPurchaseAt: new Date() }
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive")
      .populate("linkedSale");
    res.json({ invoice: populatedInvoice, sale });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

const getInvoicePayments = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, business: req.user.businessId });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (!hasInvoiceBranchAccess(invoice, req.user, "view")) {
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }
    const payments = await Payment.find({ invoice: invoice._id, business: req.user.businessId })
      .sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateInvoicePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { invoiceId } = req.params;
    const { paymentAmount = 0, paymentMethod = "cash", referenceNumber = "", notes = "" } = req.body;
    const numericPaymentAmount = Number(paymentAmount);

    const invoice = await Invoice.findOne({ _id: invoiceId, business: req.user.businessId }).session(session);
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!hasInvoiceBranchAccess(invoice, req.user, "manage")) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    if (!Number.isFinite(numericPaymentAmount) || numericPaymentAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Payment amount must be greater than zero" });
    }

    if (numericPaymentAmount > Number(invoice.balanceDue || 0)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Payment amount cannot exceed the invoice balance due" });
    }

    invoice.amountPaid = Number(invoice.amountPaid || 0) + numericPaymentAmount;
    invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid - invoice.returnedAmount);
    invoice.balance = invoice.balanceDue;
    invoice.paymentStatus = calculatePaymentStatus({
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      returnedAmount: invoice.returnedAmount
    });

    if (invoice.balanceDue === 0 && invoice.status !== "paid") {
      invoice.status = "paid";
    } else if (invoice.balanceDue > 0 && invoice.amountPaid > 0 && invoice.status !== "overdue") {
      invoice.status = "partial";
    }

    await invoice.save({ session });

    await Payment.create([
      {
        business: req.user.businessId,
        invoice: invoiceId,
        paymentMethod,
        amount: numericPaymentAmount,
        referenceNumber,
        notes,
        createdBy: req.user.id,
        status: "confirmed"
      }
    ], { session });

    if (invoice.transactionType === "outgoing" && invoice.customer) {
      await Customer.findOneAndUpdate(
        { _id: invoice.customer, business: req.user.businessId },
        { $inc: { outstandingBalance: -Math.min(numericPaymentAmount, invoice.amountPaid) } },
        { new: true, session }
      );
    }

    if (invoice.transactionType === "incoming" && invoice.supplier) {
      const itemPaymentStatus = invoice.balanceDue === 0
        ? "Fully Paid"
        : invoice.amountPaid > 0
          ? "Partially Paid"
          : "Unpaid";
      for (const item of invoice.items || []) {
        item.supplierCreditStatus = itemPaymentStatus;
        item.supplierBatchLabel = `Supplier Credit - ${itemPaymentStatus}`;
      }
      await invoice.save({ session });
      await Supplier.findOneAndUpdate(
        { _id: invoice.supplier, business: req.user.businessId },
        { $inc: { outstandingBalance: -numericPaymentAmount, totalPaid: numericPaymentAmount } },
        { new: true, session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive")
      .populate("business", "name email");

    if (invoice.transactionType === "outgoing" && invoice.customerEmail) {
      setImmediate(() => {
        sendPaymentReceivedEmail({
          recipientEmail: invoice.customerEmail,
          recipientName: invoice.customerName || "Valued Customer",
          businessName: populatedInvoice.business?.name || "Our Business",
          businessId: req.user.businessId,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          paymentAmount: `$${numericPaymentAmount.toFixed(2)}`,
          paymentDate: new Date().toLocaleDateString(),
          remainingBalance: `$${invoice.balanceDue.toFixed(2)}`,
          invoiceUrl: `${process.env.FRONTEND_URL}/invoices/${invoice._id}`,
          createdBy: req.user.id
        }).catch(err => console.error("Email sending error:", err));
      });
    }

    res.json(populatedInvoice);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

const updateInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, business: req.user.businessId }).session(session);
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!hasInvoiceBranchAccess(invoice, req.user, "manage")) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    const allowedFields = [
      "customerName",
      "customerPhone",
      "customerEmail",
      "dueDate",
      "notes",
      "status",
      "invoiceType",
      "tax",
      "discount",
      "items"
    ];

    const originalBalanceDue = invoice.balanceDue;
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "No valid invoice fields provided" });
    }

    if ((invoice.fulfillmentStatus === "collected" || invoice.stockFinalized || invoice.status === "paid") &&
        ["items", "tax", "discount"].some(field => updates[field] !== undefined)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Fulfilled or paid invoices cannot change items or totals" });
    }

    if (updates.status === "paid" && Number(invoice.balanceDue || 0) > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "An invoice cannot be marked paid while a balance remains" });
    }

    if (updates.status === "cancelled" && Number(invoice.amountPaid || 0) > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invoices with payments cannot be cancelled" });
    }

    Object.assign(invoice, updates);

    const subtotal = Array.isArray(invoice.items)
      ? invoice.items.reduce((sum, item) => sum + Number(item.total || 0), 0)
      : invoice.subtotal;

    invoice.subtotal = subtotal;
    invoice.totalAmount = subtotal + Number(invoice.tax || 0) - Number(invoice.discount || 0);
    invoice.balanceDue = Math.max(0, invoice.totalAmount - Number(invoice.amountPaid || 0) - Number(invoice.returnedAmount || 0));
    invoice.balance = invoice.balanceDue;
    invoice.paymentStatus = calculatePaymentStatus({
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      returnedAmount: invoice.returnedAmount
    });

    await invoice.save({ session });

    const balanceDiff = invoice.balanceDue - originalBalanceDue;
    if (invoice.transactionType === "outgoing" && invoice.customer && balanceDiff !== 0) {
      await Customer.findOneAndUpdate(
        { _id: invoice.customer, business: req.user.businessId },
        { $inc: { outstandingBalance: balanceDiff } },
        { new: true, session }
      );
    }

    if (invoice.transactionType === "incoming" && invoice.supplier && balanceDiff !== 0) {
      await Supplier.findOneAndUpdate(
        { _id: invoice.supplier, business: req.user.businessId },
        { $inc: { outstandingBalance: balanceDiff } },
        { new: true, session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive");

    res.json(populatedInvoice);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

const deleteInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, business: req.user.businessId }).session(session);
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!hasInvoiceBranchAccess(invoice, req.user, "manage")) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    if (invoice.fulfillmentStatus === "collected" || invoice.stockFinalized) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Collected invoices cannot be deleted" });
    }

    if (invoice.transactionType === "outgoing" && invoice.customer) {
      await Customer.findOneAndUpdate(
        { _id: invoice.customer, business: req.user.businessId },
        { $inc: { outstandingBalance: -invoice.balanceDue } },
        { new: true, session }
      );
    }

    if (invoice.transactionType === "incoming" && invoice.supplier) {
      await Supplier.findOneAndUpdate(
        { _id: invoice.supplier, business: req.user.businessId },
        { $inc: { outstandingBalance: -Number(invoice.balanceDue || 0), totalPurchases: -Number(invoice.totalAmount || 0), totalPaid: -Number(invoice.amountPaid || 0) } },
        { new: true, session }
      );
    }

    if (invoice.transactionType === "incoming") {
      for (const item of invoice.items) {
        if (item.product && Number(item.receivedQuantity || 0) > 0) {
          if (invoice.branch) {
            const branchInventory = await BranchInventory.findOne({
              business: req.user.businessId,
              branch: invoice.branch,
              product: item.product
            }).session(session);

            if (branchInventory) {
              const previousStock = branchInventory.quantity;
              branchInventory.quantity = Math.max(0, branchInventory.quantity - Number(item.receivedQuantity || 0));
              await branchInventory.save({ session });

              await InventoryMovement.create(
                [
                  {
                    business: req.user.businessId,
                    branch: invoice.branch,
                    product: item.product,
                    type: "purchase_reversal",
                    quantity: Number(item.receivedQuantity || 0),
                    previousStock,
                    newStock: branchInventory.quantity,
                    note: `Reversed supplier invoice ${invoice._id}`,
                    createdBy: req.user.id
                  }
                ],
                { session }
              );
            }
          } else {
            const product = await Product.findById(item.product).session(session);
            if (product) {
              const previousStock = product.stock;
              product.stock = Math.max(0, product.stock - Number(item.receivedQuantity || 0));
              await product.save({ session });

              await InventoryMovement.create(
                [
                  {
                    business: req.user.businessId,
                    product: product._id,
                    type: "purchase_reversal",
                    quantity: Number(item.receivedQuantity || 0),
                    previousStock,
                    newStock: product.stock,
                    note: `Reversed supplier invoice ${invoice._id}`,
                    createdBy: req.user.id
                  }
                ],
                { session }
              );
            }
          }
        }
      }
    }

    await Invoice.deleteOne({ _id: invoice._id, business: req.user.businessId }).session(session);
    await Payment.deleteMany({ invoice: invoice._id, business: req.user.businessId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, id: invoice._id });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const query = { business: req.user.businessId };
    const branchQuery = getScopedBranchQuery(req.user, req.user.businessId, req.query.branchId);
    if (!branchQuery) return res.status(403).json({ message: "You do not have access to these invoices" });
    Object.assign(query, branchQuery);

    if (req.query.transactionType) {
      query.transactionType = req.query.transactionType;
    }

    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.customerId) {
      query.customer = req.query.customerId;
    }

    if (req.query.supplierId) {
      query.supplier = req.query.supplierId;
    }

    if (req.query.returnedOnly === "true") {
      query["items.returned"] = true;
    }

    const invoices = await Invoice.find(query)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getInvoiceById =
  async (req, res) => {

    try {

      const invoice =
        await Invoice.findOne({
          _id: req.params.id,
          business: req.user.businessId
        })

        .populate(
          "business"
        );

      if (!invoice) {

        return res.status(404).json({
          message:
            "Invoice not found"
        });
      }

      const branchQuery = getScopedBranchQuery(req.user, req.user.businessId, invoice.branch?.toString());
      if (!branchQuery) {
        return res.status(403).json({ message: "You do not have access to this invoice" });
      }

      res.json(invoice);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

// 🔥 GET INVOICE FOR PDF GENERATION
const getInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
      .populate("business", "name address phone email logo subscription")
      .populate("customer", "name phone email address")
      .populate("supplier", "name phone email address")
      .populate("items.product", "name price");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Verify business ownership
    if (invoice.business._id.toString() !== req.user.businessId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const branchQuery = getScopedBranchQuery(req.user, req.user.businessId, invoice.branch?.toString());
    if (!branchQuery) {
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    // Return invoice data with HTML template structure for PDF conversion
    const pdfData = {
      success: true,
      invoice: {
        ...invoice.toObject(),
        formattedDate: new Date(invoice.createdAt).toLocaleDateString(),
        formattedDueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "No due date",
        createdByName: invoice.createdBy?.name || "System",
      },
      template: "invoice", // Frontend can use this to select the right PDF template
    };

    res.json(pdfData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 SHARE INVOICE VIA EMAIL
const shareInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { recipientEmail, message = "" } = req.body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return res.status(400).json({ message: "Valid recipient email is required" });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      business: req.user.businessId
    })
      .populate("business", "name email")
      .populate("customer", "name email");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!hasInvoiceBranchAccess(invoice, req.user, "view")) {
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    // Send invoice share email
    const sent = await sendInvoiceSharedEmail({
      recipientEmail,
      recipientName: recipientEmail.split("@")[0], // Use email prefix as name if no name provided
      senderName: req.user.name || "Team Member",
      businessName: invoice.business?.name || "Our Business",
      businessId: req.user.businessId,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      message,
      invoiceUrl: `${process.env.FRONTEND_URL}/invoices/${invoice._id}`,
      createdBy: req.user.id
    });

    if (!sent) {
      return res.status(500).json({ message: "Failed to send invoice email" });
    }

    res.json({
      success: true,
      message: `Invoice shared successfully with ${recipientEmail}`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📧 GET INVOICE EMAIL HISTORY
const getInvoiceEmailHistory = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Verify invoice belongs to user's business
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      business: req.user.businessId
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!hasInvoiceBranchAccess(invoice, req.user, "view")) {
      return res.status(403).json({ message: "You do not have access to this invoice" });
    }

    // Get email history for this invoice
    const emailHistory = await EmailHistory.find({
      invoice: invoiceId,
      business: req.user.businessId
    })
      .select("recipientEmail recipientName emailType status sentAt subject sharedMessage")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      emailHistory
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  createInvoice,
  updateInvoicePayment,
  completeInvoicePickup,
  getInvoicePayments,
  updateInvoice,
  deleteInvoice,
  returnInvoiceItem,
  getInvoices,
  getInvoiceById,
  getInvoicePDF,
  shareInvoice,
  getInvoiceEmailHistory
};