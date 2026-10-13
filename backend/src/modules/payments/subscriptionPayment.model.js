import mongoose from "mongoose";

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true
    },
    businessName: {
      type: String,
      default: ""
    },
    reference: {
      type: String,
      required: true,
      unique: true
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true
    },
    gateway: {
      type: String,
      enum: ["paystack", "flutterwave"],
      required: true
    },
    currency: {
      type: String,
      enum: ["NGN", "USD"],
      default: "NGN"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    affiliateCommission: {
      type: Number,
      default: 0,
      min: 0
    },
    paidAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);
