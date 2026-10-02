import mongoose from "mongoose";

const reportDeliveryLogSchema = new mongoose.Schema(
  {
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReportSubscription",
      required: true,
      index: true
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true
    },
    reportType: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true
    },
    errorMessage: {
      type: String,
      default: ""
    },
    sentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

reportDeliveryLogSchema.index({ subscription: 1, createdAt: -1 });
reportDeliveryLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model("ReportDeliveryLog", reportDeliveryLogSchema);
