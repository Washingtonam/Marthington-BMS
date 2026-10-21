import mongoose from "mongoose";

const shopSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "storefront" },
  whatsappNumber: { type: String, default: "", trim: true },
  accentColor: { type: String, default: "#10b981", match: /^#[0-9a-fA-F]{6}$/ },
  theme: { type: String, enum: ["light", "dark"], default: "light" }
}, { timestamps: true });

export default mongoose.model("ShopSettings", shopSettingsSchema);
