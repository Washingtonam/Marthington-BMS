import Pricing from "../subscriptions/Pricing.js";

const defaultPricing = {
  tier: "pro",
  prices: {
    monthly: {
      ngn: 15000,
      usd: 15
    },
    yearly: {
      ngn: 150000,
      usd: 150
    }
  }
};

export const getPricing = async (req, res) => {
  try {
    const pricing = await Pricing.findOne({ tier: "pro" }).lean();

    return res.status(200).json({
      success: true,
      data: pricing?.prices ?? defaultPricing.prices
    });
  } catch (err) {
    console.error("GET PRICING ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load pricing"
    });
  }
};

export const updatePricing = async (req, res) => {
  try {
    const allowedKeys = [
      "prices.monthly.ngn",
      "prices.monthly.usd",
      "prices.yearly.ngn",
      "prices.yearly.usd"
    ];

    const update = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedKeys.includes(key)) {
        update[key] = req.body[key];
      }
    });

    if (!Object.keys(update).length) {
      return res.status(400).json({
        success: false,
        message: "No valid pricing fields provided"
      });
    }

    const pricing = await Pricing.findOneAndUpdate(
      { tier: "pro" },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      data: pricing?.prices ?? defaultPricing.prices
    });
  } catch (err) {
    console.error("UPDATE PRICING ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update pricing"
    });
  }
};
