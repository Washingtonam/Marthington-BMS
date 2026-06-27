import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    globalAffiliateRate: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);

export default SystemSettings;
