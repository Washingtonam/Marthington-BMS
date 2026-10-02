import mongoose from "mongoose";

const emailCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, default: "", trim: true },
    bodyHtml: { type: String, required: true },
    footerText: { type: String, default: "Marthington BMS | Business management, made clearer." },
    footerAddress: { type: String, default: "" },
    audienceType: {
      type: String,
      enum: ["all_users", "owners", "staff", "affiliates", "business_users"],
      default: "all_users"
    },
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", default: null },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "failed", "cancelled"],
      default: "draft"
    },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    recipientCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

emailCampaignSchema.index({ status: 1, scheduledFor: 1 });
emailCampaignSchema.index({ createdAt: -1 });

export default mongoose.model("EmailCampaign", emailCampaignSchema);
