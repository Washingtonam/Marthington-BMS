import mongoose from "mongoose";

const communicationDraftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    channel: { type: String, enum: ["email", "whatsapp", "email-first", "whatsapp-first"], required: true },
    subject: { type: String, default: "", maxlength: 200 },
    message: { type: String, required: true, maxlength: 5000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

communicationDraftSchema.index({ updatedAt: -1 });

export default mongoose.model("CommunicationDraft", communicationDraftSchema);
