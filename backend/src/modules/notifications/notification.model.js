import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ["payout_approved", "payout_rejected", "payout_settled", "branch_transfer_requested", "branch_transfer_approved", "branch_transfer_rejected", "profile_update", "shop_order_received", "general"],
      default: "general",
      index: true
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    amount: {
      type: Number,
      default: null
    },

    payoutRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayoutRequest",
      default: null
    },

    transferRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BranchTransferRequest",
      default: null
    },

    shopOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopOrder",
      default: null
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    },

    actionUrl: {
      type: String,
      default: null
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

notificationSchema.index(
  { recipient: 1, type: 1, shopOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "shop_order_received", shopOrderId: { $type: "objectId" } }
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
