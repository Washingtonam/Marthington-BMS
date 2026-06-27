import mongoose from "mongoose";

const payoutRequestSchema = new mongoose.Schema(
  {
    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    affiliateCode: {
      type: String,
      default: "",
      index: true
    },

    amountRequested: {
      type: Number,
      required: true,
      default: 0
    },

    paymentDetails: {
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      accountName: { type: String, default: "" }
    },

    status: {
      type: String,
      enum: ["pending", "processing", "paid", "rejected"],
      default: "pending"
    },

    adminNote: {
      type: String,
      default: ""
    },

    processedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const PayoutRequest = mongoose.model("PayoutRequest", payoutRequestSchema);

export default PayoutRequest;
