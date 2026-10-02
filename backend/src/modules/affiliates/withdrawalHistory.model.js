import mongoose from "mongoose";

const withdrawalHistorySchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    payoutRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayoutRequest",
      default: null
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["Approved", "Rejected"],
      default: "Approved"
    },

    note: {
      type: String,
      default: ""
    },

    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: "withdrawalHistory"
  }
);

withdrawalHistorySchema.index(
  { payoutRequestId: 1 },
  { unique: true, sparse: true }
);

const WithdrawalHistory = mongoose.model("WithdrawalHistory", withdrawalHistorySchema);

export default WithdrawalHistory;
