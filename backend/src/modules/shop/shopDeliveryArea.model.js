import mongoose from "mongoose";

const shopDeliveryAreaSchema = new mongoose.Schema({
  state: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  stateKey: { type: String, required: true, lowercase: true, trim: true },
  cityKey: { type: String, required: true, lowercase: true, trim: true },
  fee: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

shopDeliveryAreaSchema.index({ stateKey: 1, cityKey: 1 }, { unique: true });

export default mongoose.model("ShopDeliveryArea", shopDeliveryAreaSchema);
