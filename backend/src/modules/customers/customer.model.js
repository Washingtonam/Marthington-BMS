import mongoose from "mongoose";

const customerSchema =
  new mongoose.Schema({

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      default: ""
    },

    email: {
      type: String,
      default: ""
    },

    address: {
      type: String,
      default: ""
    },

    notes: {
      type: String,
      default: ""
    },

    totalSpent: {
      type: Number,
      default: 0
    },

    totalOrders: {
      type: Number,
      default: 0
    },

    outstandingBalance: {
      type: Number,
      default: 0
    },

    loyaltyPoints: {
      type: Number,
      default: 0
    },

    lastPurchaseAt: {
      type: Date,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    }

  }, {
    timestamps: true
  });

export default mongoose.model(
  "Customer",
  customerSchema
);