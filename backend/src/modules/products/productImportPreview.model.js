import mongoose from "mongoose";

const productImportPreviewSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    rows: {
      type: [mongoose.Schema.Types.Mixed],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "applied"],
      default: "pending",
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    appliedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

productImportPreviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ProductImportPreview = mongoose.model("ProductImportPreview", productImportPreviewSchema);

export default ProductImportPreview;
