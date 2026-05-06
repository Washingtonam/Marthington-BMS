import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    // 🔥 SERVICE NAME
    name: {
      type: String,
      required: true,
      trim: true
    },

    // 🔥 CATEGORY
    category: {
      type: String,
      default: "General",
      trim: true
    },

    // 🔥 PRIMARY PRICE
    price: {
      type: Number,
      default: 0,
      min: 0
    },

    // 🔥 OPTIONAL COST
    costPrice: {
      type: Number,
      default: 0,
      min: 0
    },

    // 🔥 DURATION IN MINUTES
    duration: {
      type: Number,
      default: 0,
      min: 0
    },

    // 🔥 DESCRIPTION
    description: {
      type: String,
      default: ""
    },

    // 🔥 INTERNAL CODE
    code: {
      type: String,
      default: ""
    },

    // 🔥 ACTIVE/INACTIVE
    isActive: {
      type: Boolean,
      default: true
    },

    // 🔥 BUSINESS OWNER
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// ======================================
// 🔥 BACKWARD COMPATIBILITY
// ======================================

serviceSchema.virtual("sellingPrice").get(function () {
  return this.price;
});

// ======================================
// 🔥 INDEXES
// ======================================

serviceSchema.index({
  business: 1,
  name: 1
});

serviceSchema.index({
  business: 1,
  category: 1
});

// ======================================
// 🔥 JSON
// ======================================

serviceSchema.set("toJSON", {
  virtuals: true
});

serviceSchema.set("toObject", {
  virtuals: true
});

export default mongoose.model(
  "Service",
  serviceSchema
);