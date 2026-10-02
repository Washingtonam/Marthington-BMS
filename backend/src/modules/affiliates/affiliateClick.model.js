import mongoose from "mongoose";

const affiliateClickSchema = new mongoose.Schema(
  {
    affiliateCode: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    source: {
      type: String,
      default: "partner-link"
    },

    referrer: {
      type: String,
      default: ""
    },

    userAgent: {
      type: String,
      default: ""
    },

    ipAddress: {
      type: String,
      default: ""
    },

    clickedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

affiliateClickSchema.index({ affiliateCode: 1 });

const AffiliateClick = mongoose.model("AffiliateClick", affiliateClickSchema);

export default AffiliateClick;
