import mongoose from "mongoose";

const reportSubscriptionSchema = new mongoose.Schema(
  {
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    recipientName: {
      type: String,
      default: ""
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true
    },
    reportType: {
      type: String,
      enum: ["overview", "daily-analysis"],
      default: "overview"
    },
    reportSections: {
      type: [String],
      enum: ["summary", "sales", "expenses", "inventory", "staff", "paymentMethods"],
      default: ["summary", "sales", "expenses", "inventory", "staff", "paymentMethods"]
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "daily"
    },
    sendTime: {
      type: String,
      default: "18:00"
    },
    weeklyDay: {
      type: Number,
      min: 0,
      max: 6,
      default: 1
    },
    monthlyDay: {
      type: mongoose.Schema.Types.Mixed,
      default: "last",
      validate: {
        validator: (value) => value === "last" || (Number.isInteger(value) && value >= 1 && value <= 31),
        message: "monthlyDay must be an integer from 1 to 31 or last"
      }
    },
    timezone: {
      type: String,
      default: "Africa/Lagos"
    },
    status: {
      type: String,
      enum: ["enabled", "admin_disabled", "unsubscribed", "bounced"],
      default: "enabled"
    },
    isRemoved: {
      type: Boolean,
      default: false,
      index: true
    },
    lastSentAt: {
      type: Date,
      default: null
    },
    lastError: {
      type: String,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

reportSubscriptionSchema.index({ business: 1, recipientEmail: 1, reportType: 1, frequency: 1 }, { unique: true });
reportSubscriptionSchema.index({ status: 1, frequency: 1 });

export default mongoose.model("ReportSubscription", reportSubscriptionSchema);
