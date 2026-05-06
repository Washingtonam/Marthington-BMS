import mongoose from "mongoose";

const purchaseItemSchema =
  new mongoose.Schema({

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },

    name: String,

    quantity: Number,

    costPrice: Number,

    total: Number

  }, { _id: false });

const purchaseOrderSchema =
  new mongoose.Schema({

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier"
    },

    items: [purchaseItemSchema],

    totalAmount: {
      type: Number,
      default: 0
    },

    status: {
      type: String,

      enum: [
        "pending",
        "received",
        "cancelled"
      ],

      default: "pending"
    },

    notes: {
      type: String,
      default: ""
    }

  }, {
    timestamps: true
  });

export default mongoose.model(
  "PurchaseOrder",
  purchaseOrderSchema
);