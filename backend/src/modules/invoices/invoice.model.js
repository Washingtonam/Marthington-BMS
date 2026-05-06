import mongoose from "mongoose";

const invoiceItemSchema =
  new mongoose.Schema({

    name: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      default: 1
    },

    price: {
      type: Number,
      default: 0
    },

    total: {
      type: Number,
      default: 0
    }

  }, { _id: false });

const invoiceSchema =
  new mongoose.Schema({

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    customerName: {
      type: String,
      default: ""
    },

    customerPhone: {
      type: String,
      default: ""
    },

    customerEmail: {
      type: String,
      default: ""
    },

    items: [invoiceItemSchema],

    subtotal: {
      type: Number,
      default: 0
    },

    tax: {
      type: Number,
      default: 0
    },

    discount: {
      type: Number,
      default: 0
    },

    totalAmount: {
      type: Number,
      default: 0
    },

    amountPaid: {
      type: Number,
      default: 0
    },

    balance: {
      type: Number,
      default: 0
    },

    status: {
      type: String,

      enum: [
        "draft",
        "sent",
        "partial",
        "paid",
        "overdue"
      ],

      default: "draft"
    },

    invoiceType: {
      type: String,

      enum: [
        "invoice",
        "quotation",
        "proforma"
      ],

      default: "invoice"
    },

    dueDate: {
      type: Date,
      default: null
    },

    notes: {
      type: String,
      default: ""
    },

    invoiceNumber: {
      type: String,
      unique: true
    }

  }, {
    timestamps: true
  });

export default mongoose.model(
  "Invoice",
  invoiceSchema
);