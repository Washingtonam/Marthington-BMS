import mongoose from "mongoose";
import Invoice from "./invoice.model.js";
import Product from "../products/product.model.js";
import Customer from "../customers/customer.model.js";
import Supplier from "../suppliers/supplier.model.js";
import InventoryMovement from "../inventory/inventory.model.js";

const generateInvoiceNumber = () => {
  return (
    "INV-" +
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()
  );
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
      invoiceType
    } = req.body;

    const businessId = req.user.businessId;

    const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const totalAmount = subtotal + Number(tax || 0) - Number(discount || 0);
    const returnedAmount = 0;
    const balanceDue = Math.max(0, totalAmount - Number(amountPaid || 0));
    const paymentStatus = calculatePaymentStatus({ totalAmount, amountPaid, returnedAmount });

    if (transactionType === "incoming" && !supplier) {
      throw new Error("Supplier must be provided for incoming supplier invoices.");
    }

    const processedItems = [];

    for (const item of items) {
      const invoiceItem = {
        product: item.product || null,
        name: item.name,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        total: Number(item.total || 0),
        returned: false,
        returnQuantity: 0,
        returnAmount: 0,
        receivedQuantity: transactionType === "incoming" ? Number(item.quantity || 0) : 0,
        soldQuantity: 0,
        supplierCreditStatus: transactionType === "incoming" ? "Unpaid" : null,
        supplierBatchLabel: transactionType === "incoming" ? "Supplier Credit - Unpaid" : ""
      };

      if (transactionType === "incoming" && item.product) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new Error(`Product not found for supplier item: ${item.name}`);
        }

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

      processedItems.push(invoiceItem);
    }

    const invoice = await Invoice.create(
      [
        {
          business: businessId,
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
          amountPaid: Number(amountPaid || 0),
          balance: balanceDue,
          balanceDue,
          returnedAmount,
          paymentStatus,
          dueDate,
          notes,
          invoiceType,
          invoiceNumber: generateInvoiceNumber()
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
    }

    await session.commitTransaction();
    session.endSession();

    const populatedInvoice = await Invoice.findById(createdInvoice._id)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive");

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

const updateInvoicePayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentAmount = 0 } = req.body;

    const invoice = await Invoice.findOne({ _id: invoiceId, business: req.user.businessId });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.amountPaid = Number(invoice.amountPaid || 0) + Number(paymentAmount || 0);
    invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid - invoice.returnedAmount);
    invoice.balance = invoice.balanceDue;
    invoice.paymentStatus = calculatePaymentStatus({
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      returnedAmount: invoice.returnedAmount
    });

    await invoice.save();

    if (invoice.transactionType === "outgoing" && invoice.customer) {
      await Customer.findOneAndUpdate(
        { _id: invoice.customer, business: req.user.businessId },
        { $inc: { outstandingBalance: -Math.min(paymentAmount, invoice.amountPaid) } },
        { new: true }
      );
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customer", "name phone email outstandingBalance")
      .populate("supplier", "name phone email isActive");

    res.json(populatedInvoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const query = { business: req.user.businessId };

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
        await Invoice.findById(
          req.params.id
        )

        .populate(
          "business"
        );

      if (!invoice) {

        return res.status(404).json({
          message:
            "Invoice not found"
        });
      }

      res.json(invoice);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

export default {
  createInvoice,
  updateInvoicePayment,
  returnInvoiceItem,
  getInvoices,
  getInvoiceById
};