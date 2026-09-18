import mongoose from "mongoose";

const emailCampaignDeliverySchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: "EmailCampaign", required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    recipientEmail: { type: String, required: true, lowercase: true },
    recipientName: { type: String, default: "" },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    errorMessage: { type: String, default: "" },
    sentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

emailCampaignDeliverySchema.index({ campaign: 1, recipientEmail: 1 }, { unique: true });
emailCampaignDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model("EmailCampaignDelivery", emailCampaignDeliverySchema);
