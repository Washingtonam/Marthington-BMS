import mongoose from "mongoose";

const affiliatePayoutSchema = new mongoose.Schema(
  {
    affiliateCode: {
      type: String,
      required: true,
      index: true
    },

    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true
    },

    businessName: {
      type: String,
      default: ""
    },

    industry: {
      type: String,
      default: ""
    },

    amountPaid: {
      type: Number,
      default: 0
    },

    commissionEarned: {
      type: Number,
      default: 0
    },

    rateApplied: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["credited", "pending"],
      default: "credited"
    },

    transactionDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const AffiliatePayout = mongoose.model("AffiliatePayout", affiliatePayoutSchema);

export default AffiliatePayout;
