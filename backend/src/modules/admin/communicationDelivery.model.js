import mongoose from "mongoose";

const communicationDeliverySchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true
    },
    recipientName: { type: String, default: "" },
    recipientEmail: { type: String, default: "", lowercase: true },
    recipientPhone: { type: String, default: "" },
    channel: {
      type: String,
      enum: ["email", "whatsapp"],
      required: true
    },
    whatsappOptInConfirmed: { type: Boolean, default: false },
    whatsappOptInConfirmedAt: { type: Date, default: null },
    subject: { type: String, default: "" },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true
    },
    errorMessage: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

communicationDeliverySchema.index({ createdAt: -1 });
communicationDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model("CommunicationDelivery", communicationDeliverySchema);
