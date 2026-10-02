import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    // 🔥 NEW
    category: {
      type: String,
      default: "General",
      trim: true
    },

    // 🔥 SINGLE SOURCE OF TRUTH
    price: {
      type: Number,
      required: true,
      default: 0
    },

    costPrice: {
      type: Number,
      default: 0
    },

    stock: {
      type: Number,
      default: 0
    },

    // 🔥 PREP FOR FUTURE BARCODE SUPPORT
    sku: {
      type: String,
      default: ""
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    }
  },
  { timestamps: true }
);

// 🔥 BACKWARD COMPATIBILITY
productSchema.virtual("sellingPrice").get(function () {
  return this.price;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

const Product = mongoose.model("Product", productSchema);

export default Product;