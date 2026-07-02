import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    globalAffiliateRate: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    }
    ,
    adminContact: {
      name: { type: String, default: "Support" },
      email: { type: String, default: "support@example.com" },
      phone: { type: String, default: "" }
    }
  },
  {
    timestamps: true
  }
);

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);

export default SystemSettings;
