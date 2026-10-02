import mongoose from "mongoose";

const emailPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    marketingOptOut: { type: Boolean, default: false },
    optedOutAt: { type: Date, default: null },
    source: { type: String, enum: ["user", "admin", "unsubscribe_link"], default: "user" }
  },
  { timestamps: true }
);

export default mongoose.model("EmailPreference", emailPreferenceSchema);
