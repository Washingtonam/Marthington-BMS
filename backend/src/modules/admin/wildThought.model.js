import mongoose from "mongoose";

const wildThoughtSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    thought: { type: String, required: true, trim: true, maxlength: 10000 },
    venture: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      enum: ["product", "marketing", "sales", "operations", "customer_experience", "finance", "new_venture", "other"],
      default: "other"
    },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["captured", "planned", "in_progress", "done"], default: "captured" },
    nextAction: { type: String, trim: true, maxlength: 1000, default: "" },
    reviewDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

wildThoughtSchema.index({ createdBy: 1, updatedAt: -1 });
wildThoughtSchema.index({ createdBy: 1, venture: 1, status: 1 });

const WildThought = mongoose.model("WildThought", wildThoughtSchema);

export default WildThought;
