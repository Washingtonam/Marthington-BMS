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
      email: { type: String, default: "support@marthington.com" },
      phone: { type: String, default: "" }
    },
    totalCommissionsCleared: {
      type: Number,
      default: 0
    },
    planAccess: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);

export default SystemSettings;
