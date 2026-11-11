import mongoose from "mongoose";

const catalogPairDecisionSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    firstProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    secondProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    decision: {
      type: String,
      enum: ["keep-separate"],
      required: true
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

catalogPairDecisionSchema.index(
  { business: 1, firstProduct: 1, secondProduct: 1 },
  { unique: true }
);

export default mongoose.model("CatalogPairDecision", catalogPairDecisionSchema);
