import mongoose from "mongoose";

const commissionClaimSchema = new mongoose.Schema(
  {
    claimKey: { type: String, required: true, unique: true },
    affiliate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    affiliateCode: { type: String, required: true, index: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", default: null, index: true },
    kind: {
      type: String,
      enum: ["cpa", "direct_referral_bonus", "payout_milestone"],
      required: true,
      index: true
    },
    actionKey: { type: String, default: "" },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 1000 },
    amount: { type: Number, required: true, min: 0 },
    evidence: { type: String, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    adminNote: { type: String, default: "", maxlength: 1000 },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    processedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

commissionClaimSchema.index({ affiliate: 1, createdAt: -1 });
commissionClaimSchema.index({ status: 1, createdAt: -1 });

const CommissionClaim = mongoose.model("CommissionClaim", commissionClaimSchema);

export default CommissionClaim;
