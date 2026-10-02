import mongoose from "mongoose";

const PricingSchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      default: "pro",
      unique: true
    },
    prices: {
      monthly: {
        ngn: {
          type: Number,
          default: 15000
        },
        usd: {
          type: Number,
          default: 15
        }
      },
      yearly: {
        ngn: {
          type: Number,
          default: 150000
        },
        usd: {
          type: Number,
          default: 150
        }
      }
    }
  },
  { timestamps: true }
);

const Pricing = mongoose.model("Pricing", PricingSchema);

export default Pricing;
