import mongoose from "mongoose";

const payoutHistorySchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Paid"
    },
    date: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    collection: "payoutHistory"
  }
);

const PayoutHistory = mongoose.model("PayoutHistory", payoutHistorySchema);

export default PayoutHistory;
