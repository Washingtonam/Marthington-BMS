import mongoose from "mongoose";

const shopCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sourceCategories: { type: [String], default: [] }
}, { timestamps: true });

shopCategorySchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export default mongoose.model("ShopCategory", shopCategorySchema);
