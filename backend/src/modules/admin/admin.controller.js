import Business from "../businesses/business.model.js";
import User from "../users/user.model.js";
import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";
import SystemSettings from "./systemSettings.model.js";
import PayoutRequest from "../affiliates/payoutRequest.model.js";
import AffiliatePayout from "../affiliates/affiliatePayout.model.js";
import WithdrawalHistory from "../affiliates/withdrawalHistory.model.js";
import AffiliateClick from "../affiliates/affiliateClick.model.js";
import Notification from "../notifications/notification.model.js";
import Transaction from "../transactions/transaction.model.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Audit from "./audit.model.js";
import OperationLog from "../../models/operationLog.model.js";
import importQueue from "../../queues/importQueue.js";
import ReportSubscription from "./reportSubscription.model.js";
import ReportDeliveryLog from "./reportDeliveryLog.model.js";
import CommunicationDelivery from "./communicationDelivery.model.js";
import jwt from "jsonwebtoken";
import { sendCampaignEmail, sendReportEmail, sendSubscriptionEmail } from "../../utils/emailService.js";
import { getEmailConfigStatus, verifyEmailConfig } from "../../config/email.js";
import EmailCampaign from "./emailCampaign.model.js";
import EmailPreference from "./emailPreference.model.js";
import { getReportSnapshot } from "./reportSnapshot.js";
import { sendBusinessReportWhatsApp } from "../../utils/reportWhatsApp.js";
import { sendWhatsAppTemplate } from "../whatsapp/whatsapp.service.js";
import { normalizePlanAccess, validatePlanAccess } from "../subscriptions/planAccess.js";
import { getSubscriptionRecipients, processEmailCampaignById } from "../../jobs/emailCampaign.job.js";
import SubscriptionPayment from "../payments/subscriptionPayment.model.js";
import { buildRevenueWindow, calculatePercentChange, resolveRevenueRange } from "./adminRevenue.utils.js";
import { defaultCommissionSchedule, validateCommissionSchedule } from "../affiliates/commissionSchedule.js";

const subscriptionEmailAudiences = [
  "subscription_all",
  "subscription_active_pro",
  "subscription_expiring_7",
  "subscription_expiring_30",
  "subscription_trial",
  "subscription_expired"
];

// 🔥 NORMALIZER (SINGLE SOURCE OF TRUTH)
const formatBusiness = (business) => {
  const obj = business.toObject();

  const subPlan = obj.subscription?.plan;

  return {
    ...obj,
    plan: subPlan || "free",
    isPro: obj.isPro === true || (subPlan === "pro" && obj.subscription?.status === "active"),
    subscription: {
      ...obj.subscription,
      plan: subPlan || "free",
      status: obj.subscription?.status || "trial"
    }
  };
};

// 🔥 OVERVIEW (DASHBOARD)
const listBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find()
      .select("name owner email phone whatsapp industryType subscription status createdAt")
      .populate("owner", "name email phone phoneNumber")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      businesses: businesses.map((business) => ({
        _id: business._id,
        name: business.name,
        industryType: business.industryType || "retail",
        ownerId: business.owner?._id || null,
        ownerName: business.owner?.name || "",
        ownerEmail: business.owner?.email || "",
        ownerPhone: business.owner?.phoneNumber || business.owner?.phone || "",
        businessPhone: business.phone || "",
        whatsappPhone: business.whatsapp?.number || business.owner?.phoneNumber || business.owner?.phone || business.phone || "",
        subscription: {
          plan: business.subscription?.plan || "free",
          status: business.subscription?.status || "trial"
        },
        plan: business.subscription?.plan || "free",
        isPro: business.subscription?.plan === "pro" && business.subscription?.status === "active",
        status: business.status || "active"
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listSubscriptions = async (req, res) => {
  try {
    const businesses = await Business.find()
      .select("name owner email phone whatsapp industryType status createdAt subscription")
      .populate("owner", "name email phone phoneNumber")
      .sort({ "subscription.expiresAt": 1, createdAt: -1 })
      .lean();

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subscriptions = businesses.map((business) => {
      const subscription = business.subscription || {};
      const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
      const status = expiresAt && expiresAt < now ? "expired" : subscription.status || "trial";

      return {
        _id: business._id,
        name: business.name,
        industryType: business.industryType || "retail",
        businessStatus: business.status || "active",
        ownerName: business.owner?.name || "",
        ownerEmail: business.owner?.email || "",
        ownerPhone: business.owner?.phoneNumber || business.owner?.phone || "",
        businessPhone: business.phone || "",
        whatsappPhone: business.whatsapp?.number || business.owner?.phoneNumber || business.owner?.phone || business.phone || "",
        createdAt: business.createdAt,
        subscription: {
          plan: subscription.plan || "free",
          status,
          billingCycle: subscription.billingCycle || null,
          startedAt: subscription.startedAt || null,
          expiresAt: subscription.expiresAt || null,
          amount: subscription.amount || 0,
          tier: subscription.tier || ""
        }
      };
    });

    const stats = subscriptions.reduce((summary, business) => {
      const { plan, status, expiresAt } = business.subscription;
      const expiry = expiresAt ? new Date(expiresAt) : null;
      const active = plan === "pro" && status === "active";

      if (active) summary.active += 1;
      if (status === "trial") summary.trial += 1;
      if (status === "expired") summary.expired += 1;
      if (active && expiry && expiry >= now && expiry <= sevenDaysFromNow) summary.expiringIn7Days += 1;
      if (active && expiry && expiry >= now && expiry <= thirtyDaysFromNow) summary.expiringIn30Days += 1;
      return summary;
    }, {
      total: subscriptions.length,
      active: 0,
      trial: 0,
      expired: 0,
      expiringIn7Days: 0,
      expiringIn30Days: 0
    });

    res.json({ subscriptions, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSubscriptionEmailAudience = async (req, res) => {
  try {
    const { audienceType } = req.query;
    if (!subscriptionEmailAudiences.includes(audienceType)) {
      return res.status(400).json({ message: "Invalid subscription email audience" });
    }

    const recipients = await getSubscriptionRecipients(audienceType);
    res.json({
      audienceType,
      count: recipients.length,
      recipients: recipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
        businessName: recipient.variables?.businessName || ""
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listSubscriptionEmailDrafts = async (req, res) => {
  try {
    const drafts = await EmailCampaign.find({
      audienceType: { $in: subscriptionEmailAudiences },
      status: "draft"
    }).sort({ updatedAt: -1 }).lean();
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveSubscriptionEmailDraft = async (req, res) => {
  try {
    const { audienceType, subject, previewText = "", bodyText } = req.body;
    if (!subscriptionEmailAudiences.includes(audienceType)) {
      return res.status(400).json({ message: "Invalid subscription email audience" });
    }
    if (typeof subject !== "string" || !subject.trim() || subject.length > 200 || /[\r\n]/.test(subject)) {
      return res.status(400).json({ message: "A valid email subject of up to 200 characters is required" });
    }
    if (typeof bodyText !== "string" || !bodyText.trim() || bodyText.length > 20000) {
      return res.status(400).json({ message: "An email message of up to 20,000 characters is required" });
    }
    if (typeof previewText !== "string" || previewText.length > 300) {
      return res.status(400).json({ message: "Preview text must be 300 characters or fewer" });
    }

    const name = `Subscription email: ${audienceType}`;
    const draft = await EmailCampaign.findOneAndUpdate(
      { name, audienceType, status: "draft" },
      {
        $set: {
          name,
          subject: subject.trim(),
          previewText,
          bodyHtml: bodyText,
          audienceType,
          status: "draft",
          scheduledFor: null,
          updatedBy: req.user.id
        },
        $setOnInsert: {
          createdBy: req.user.id,
          footerText: "Marthington BMS | Business management, made clearer."
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ draft });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendSubscriptionEmailDraft = async (req, res) => {
  try {
    const draft = await EmailCampaign.findOne({
      _id: req.params.id,
      audienceType: { $in: subscriptionEmailAudiences },
      status: "draft"
    }).lean();
    if (!draft) return res.status(404).json({ message: "Subscription email draft not found or already sent" });

    const eligibleRecipients = await getSubscriptionRecipients(draft.audienceType);
    if (eligibleRecipients.length === 0) {
      return res.status(400).json({ message: "No active business owner email addresses match this audience" });
    }

    const { recipientEmails } = req.body || {};
    let selectedRecipients = null;
    if (recipientEmails !== undefined) {
      if (!Array.isArray(recipientEmails) || recipientEmails.length === 0 || recipientEmails.length > 5000) {
        return res.status(400).json({ message: "Select at least one recipient and no more than 5,000 recipients." });
      }
      const eligibleEmails = new Set(eligibleRecipients.map((recipient) => recipient.email.toLowerCase()));
      selectedRecipients = [...new Set(recipientEmails
        .filter((email) => typeof email === "string")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean))];
      if (!selectedRecipients.length || selectedRecipients.some((email) => !eligibleEmails.has(email))) {
        return res.status(400).json({ message: "One or more selected email addresses are no longer eligible for this audience. Refresh the recipient list and try again." });
      }
    }
    const recipients = selectedRecipients
      ? eligibleRecipients.filter((recipient) => selectedRecipients.includes(recipient.email.toLowerCase()))
      : eligibleRecipients;

    const queued = await EmailCampaign.findOneAndUpdate(
      { _id: draft._id, status: "draft" },
      {
        $set: {
          status: "scheduled",
          scheduledFor: new Date(),
          recipientCount: recipients.length,
          selectedRecipients,
          updatedBy: req.user.id
        }
      },
      { new: true }
    ).lean();
    if (!queued) return res.status(409).json({ message: "This email draft is already being sent" });

    processEmailCampaignById(queued._id).catch((error) => {
      console.error("Subscription email delivery failed:", error.message);
    });

    res.status(202).json({
      message: "Subscription email queued for delivery",
      campaignId: queued._id,
      recipientCount: recipients.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSubscriptionEmailCampaign = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      audienceType: { $in: subscriptionEmailAudiences }
    }).select("status subject recipientCount deliveredCount failedCount sentAt").lean();
    if (!campaign) return res.status(404).json({ message: "Subscription email campaign not found" });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getRevenue = async (req, res) => {
  try {
    const range = resolveRevenueRange(req.query.range || "30d");
    if (!range) return res.status(400).json({ message: "Choose a supported revenue range: 30d, 90d, or 12m." });

    const { start, end, previousStart } = buildRevenueWindow(range);
    const [salesResult = {}, paymentResult = {}, activeSubscriptionRecords, capturedPayments] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: previousStart, $lt: end },
            isDeleted: { $ne: true },
            status: { $ne: "reversed" }
          }
        },
        {
          $facet: {
            current: [
              { $match: { createdAt: { $gte: start } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
            ],
            previous: [
              { $match: { createdAt: { $lt: start } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
            ],
            trend: [
              { $match: { createdAt: { $gte: start } } },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
                  amount: { $sum: "$totalAmount" },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ],
            topBusinesses: [
              { $match: { createdAt: { $gte: start } } },
              { $group: { _id: "$business", amount: { $sum: "$totalAmount" }, saleCount: { $sum: 1 } } },
              { $sort: { amount: -1 } },
              { $limit: 8 },
              {
                $lookup: {
                  from: "businesses",
                  localField: "_id",
                  foreignField: "_id",
                  as: "business"
                }
              },
              {
                $project: {
                  _id: 0,
                  businessId: "$_id",
                  businessName: { $ifNull: [{ $arrayElemAt: ["$business.name", 0] }, "Unknown business"] },
                  amount: 1,
                  saleCount: 1
                }
              }
            ]
          }
        }
      ]),
      SubscriptionPayment.aggregate([
        { $match: { paidAt: { $gte: previousStart, $lt: end } } },
        {
          $facet: {
            current: [
              { $match: { paidAt: { $gte: start } } },
              {
                $group: {
                  _id: "$currency",
                  gross: { $sum: "$amount" },
                  commissions: { $sum: "$affiliateCommission" },
                  count: { $sum: 1 }
                }
              }
            ],
            previous: [
              { $match: { paidAt: { $lt: start } } },
              {
                $group: {
                  _id: "$currency",
                  gross: { $sum: "$amount" },
                  commissions: { $sum: "$affiliateCommission" },
                  count: { $sum: 1 }
                }
              }
            ],
            trend: [
              { $match: { paidAt: { $gte: start } } },
              {
                $group: {
                  _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: "UTC" } },
                    currency: "$currency"
                  },
                  gross: { $sum: "$amount" },
                  commissions: { $sum: "$affiliateCommission" }
                }
              },
              { $sort: { "_id.date": 1 } }
            ]
          }
        }
      ]),
      Business.find({
        "subscription.plan": "pro",
        "subscription.status": "active",
        $or: [
          { "subscription.expiresAt": { $gt: end } },
          { "subscription.expiresAt": null },
          { "subscription.expiresAt": { $exists: false } }
        ]
      })
        .select("name phone whatsapp.number owner subscription.amount subscription.billingCycle subscription.currency subscription.expiresAt subscription.tier")
        .populate("owner", "name email phone phoneNumber")
        .sort({ name: 1 })
        .lean(),
      SubscriptionPayment.find({ paidAt: { $gte: start, $lt: end } })
        .select("businessName reference billingCycle gateway currency amount affiliateCommission paidAt")
        .sort({ paidAt: -1 })
        .limit(500)
        .lean()
    ]);

    const sales = salesResult[0] || {};
    const salesCurrent = sales.current?.[0] || { total: 0, count: 0 };
    const salesPrevious = sales.previous?.[0] || { total: 0, count: 0 };
    const payment = paymentResult[0] || {};
    const currencyTotals = (rows = []) => rows.reduce((totals, row) => {
      const currency = row._id === "USD" ? "USD" : "NGN";
      totals[currency] = {
        gross: Number(row.gross || 0),
        commissions: Number(row.commissions || 0),
        net: Number(row.gross || 0) - Number(row.commissions || 0),
        count: Number(row.count || 0)
      };
      return totals;
    }, { NGN: { gross: 0, commissions: 0, net: 0, count: 0 }, USD: { gross: 0, commissions: 0, net: 0, count: 0 } });

    const monthlyRunRate = activeSubscriptionRecords.reduce((totals, business) => {
      const subscription = business.subscription || {};
      const divisor = subscription.billingCycle === "yearly" ? 12 : 1;
      const amount = Number(subscription.amount || 0) / divisor;
      if (subscription.currency === "NGN" || subscription.currency === "USD") {
        totals[subscription.currency] += amount;
      } else {
        totals.unrecordedCurrencyCount += 1;
      }
      return totals;
    }, { NGN: 0, USD: 0, unrecordedCurrencyCount: 0 });

    const currentPlatform = currencyTotals(payment.current);
    const previousPlatform = currencyTotals(payment.previous);
    const activeSubscriptionDetails = activeSubscriptionRecords.map((business) => ({
      businessId: business._id,
      businessName: business.name || "Unnamed business",
      ownerName: business.owner?.name || "",
      ownerEmail: business.owner?.email || "",
      ownerPhone: business.owner?.phoneNumber || business.owner?.phone || "",
      businessPhone: business.whatsapp?.number || business.phone || "",
      plan: business.subscription?.plan || "pro",
      tier: business.subscription?.tier || "",
      billingCycle: business.subscription?.billingCycle || "",
      amount: Number(business.subscription?.amount || 0),
      currency: business.subscription?.currency || null,
      expiresAt: business.subscription?.expiresAt || null
    }));
    const unrecordedCurrencyDetails = activeSubscriptionDetails.filter((subscription) => !subscription.currency);

    res.json({
      range,
      period: { start, end, previousStart },
      tenantSales: {
        total: Number(salesCurrent.total || 0),
        saleCount: Number(salesCurrent.count || 0),
        previousTotal: Number(salesPrevious.total || 0),
        changePercent: calculatePercentChange(Number(salesCurrent.total || 0), Number(salesPrevious.total || 0)),
        trend: sales.trend || [],
        topBusinesses: sales.topBusinesses || []
      },
      platform: {
        captured: currentPlatform,
        previousCaptured: previousPlatform,
        monthlyRunRate,
        unrecordedCurrencySubscriptions: monthlyRunRate.unrecordedCurrencyCount,
        activeSubscriptions: activeSubscriptionDetails.length,
        activeSubscriptionDetails,
        unrecordedCurrencyDetails,
        trend: (payment.trend || []).map((row) => ({
          date: row._id.date,
          currency: row._id.currency === "USD" ? "USD" : "NGN",
          gross: Number(row.gross || 0),
          commissions: Number(row.commissions || 0),
          net: Number(row.gross || 0) - Number(row.commissions || 0)
        })),
        latestPayments: capturedPayments,
        capturedPayments,
        capturedPaymentCount: Number((payment.current || []).reduce((sum, row) => sum + Number(row.count || 0), 0)),
        capturedPaymentsTruncated: Number((payment.current || []).reduce((sum, row) => sum + Number(row.count || 0), 0)) > capturedPayments.length,
        historyNotice: "Verified subscription receipts are recorded from this tracking rollout onward; earlier gateway receipts are not available for historical totals."
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOverview = async (req, res) => {
  try {
    const businessesCount = await Business.countDocuments();
    const usersCount = await User.countDocuments();
    const salesRecords = await Sale.find();

    const totalRevenue = salesRecords.reduce(
      (sum, sale) => sum + (sale.totalAmount || 0),
      0
    );

    const activeSubscriptions = await Business.countDocuments({
      "subscription.status": "active"
    });

    const [affiliateTotals, pendingAffiliatePayouts, affiliateSettings, approvedWithdrawals] = await Promise.all([
      User.aggregate([
        { $match: { affiliateCode: { $exists: true, $ne: null } } },
        { $group: { _id: null, totalEarned: { $sum: "$totalEarned" }, availableBalance: { $sum: "$walletBalance" }, totalPartners: { $sum: 1 } } }
      ]),
      PayoutRequest.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, amount: { $sum: "$amountRequested" }, count: { $sum: 1 } } }
      ]),
      SystemSettings.findOne().lean(),
      WithdrawalHistory.aggregate([
        { $match: { status: "Approved" } },
        { $group: { _id: null, amount: { $sum: "$amount" } } }
      ])
    ]);

    const affiliateSummary = {
      totalPartners: Number(affiliateTotals[0]?.totalPartners || 0),
      totalEarned: Number(affiliateTotals[0]?.totalEarned || 0),
      availableBalance: Number(affiliateTotals[0]?.availableBalance || 0),
      pendingPayouts: Number(pendingAffiliatePayouts[0]?.amount || 0),
      pendingPayoutRequests: Number(pendingAffiliatePayouts[0]?.count || 0),
      paidPayouts: Number(approvedWithdrawals[0]?.amount || 0),
      currentRate: Number(affiliateSettings?.globalAffiliateRate ?? 20)
    };

    const industryCounts = {
      retail: 0,
      school: 0,
      hospital: 0
    };

    const salesSummary = await Sale.aggregate([
      {
        $group: {
          _id: "$business",
          totalSales: { $sum: "$totalAmount" },
          saleCount: { $sum: 1 }
        }
      }
    ]);

    const salesMap = salesSummary.reduce((map, item) => {
      map[item._id?.toString()] = {
        totalSales: item.totalSales,
        saleCount: item.saleCount
      };
      return map;
    }, {});

    const businessList = await Business.find()
      .populate("owner", "name email phone phoneNumber")
      .sort({ createdAt: -1 });

    const formattedBusinesses = businessList.map((business) => {
      const obj = formatBusiness(business);

      const industry = obj.industryType || "retail";
      if (industryCounts[industry] !== undefined) {
        industryCounts[industry] += 1;
      }

      const summary = salesMap[business._id.toString()] || {
        totalSales: 0,
        saleCount: 0
      };

      return {
        ...obj,
        ownerId: business.owner?._id || null,
        ownerName: business.owner?.name || "",
        ownerEmail: business.owner?.email || "",
        ownerPhone: business.owner?.phoneNumber || business.owner?.phone || "",
        businessPhone: business.phone || "",
        whatsappPhone: business.whatsapp?.number || business.owner?.phoneNumber || business.owner?.phone || business.phone || "",
        totalSalesRecord: summary.totalSales,
        saleCount: summary.saleCount,
        studentCount: obj.studentCount || 0,
        activePatientCount: obj.activePatientCount || 0
      };
    });

    res.json({
      stats: {
        totalRevenue,
        totalUsers: usersCount,
        activeSubscriptions,
        industryCounts,
        totalBusinesses: businessesCount,
        affiliateSummary
      },
      businesses: formattedBusinesses
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 ADMIN CONTROL (FULL FIX)
const updateSubscription = async (req, res) => {
  try {
    const {
      plan,
      billingCycle,
      duration,
      industryType,
      tier,
      status
    } = req.body;

    if (!["free", "pro"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    if (billingCycle !== undefined && !["monthly", "yearly", null].includes(billingCycle)) {
      return res.status(400).json({ message: "Invalid billing cycle" });
    }

    if (status !== undefined && !["trial", "active", "expired"].includes(status)) {
      return res.status(400).json({ message: "Invalid subscription status" });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    let update = {};

    if (industryType && ["retail", "school", "hospital"].includes(industryType)) {
      update.industryType = industryType;
    }

    if (status !== undefined) {
      if (plan === "free") {
        update.plan = "free";
        update.subscription = {
          plan: "free",
          billingCycle: null,
          status,
          startedAt: null,
          expiresAt: null,
          amount: 0,
          tier: tier || "",
          reference: "admin_override"
        };
      } else {
        const now = new Date();
        const cycle = billingCycle || business.subscription?.billingCycle || "monthly";
        const subscription = {
          ...business.subscription?.toObject?.(),
          plan: "pro",
          billingCycle: cycle,
          status,
          tier: tier || business.subscription?.tier || "Premium Plan",
          reference: "admin_override"
        };

        if (status === "active" && (!subscription.startedAt || !subscription.expiresAt || business.subscription?.status !== "active")) {
          const expiresAt = new Date(now);
          if (cycle === "yearly") {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          }
          subscription.startedAt = now;
          subscription.expiresAt = expiresAt;
        }

        update.plan = "pro";
        update.subscription = subscription;
      }

      const managed = await Business.findByIdAndUpdate(req.params.id, update, { new: true });
      return res.json({
        message: "Subscription updated successfully",
        business: formatBusiness(managed)
      });
    }

    if (plan === "free") {
      update.plan = "free";
      update.subscription = {
        plan: "free",
        billingCycle: null,
        status: "expired",
        startedAt: null,
        expiresAt: null,
        amount: 0,
        tier: tier || "",
        reference: "admin_downgrade"
      };
    } else {
      const now = new Date();

      let baseDate =
        business.subscription?.expiresAt &&
        business.subscription.expiresAt > now
          ? new Date(business.subscription.expiresAt)
          : now;

      const cycle = billingCycle || "monthly";
      const dur = duration || 1;

      if (cycle === "yearly") {
        baseDate.setFullYear(baseDate.getFullYear() + dur);
      } else {
        baseDate.setMonth(baseDate.getMonth() + dur);
      }

      update.plan = "pro";
      update.subscription = {
        plan: "pro",
        billingCycle: cycle,
        status: "active",
        startedAt: business.subscription?.startedAt || now,
        expiresAt: baseDate,
        amount: 0,
        tier: tier || business.subscription?.tier || "Premium Plan",
        reference: "admin_override"
      };
    }

    const updated = await Business.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json({
      message: "Subscription updated successfully",
      business: formatBusiness(updated)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= BUSINESS STATUS CONTROLS =================
const suspendBusiness = async (req, res) => {
  try {
    const id = req.params.id;
    const reason = req.body.reason || "";
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });
    business.status = "suspended";
    await business.save();
    // audit
    await Audit.create({ operatorId: req.user.id, operatorEmail: req.user.email, action: "suspend", targetEntity: business._id, reason: reason || "suspended by admin" });
    res.json({ message: "Business suspended" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const unsuspendBusiness = async (req, res) => {
  try {
    const id = req.params.id;
    const reason = req.body.reason || "";
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });
    business.status = "active";
    await business.save();
    await Audit.create({ operatorId: req.user.id, operatorEmail: req.user.email, action: "unsuspend", targetEntity: business._id, reason: reason || "unsuspended by admin" });
    res.json({ message: "Business unsuspended" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    const id = req.params.id;
    const permanent = req.query.permanent === "true";
    const reason = (req.body && req.body.reason) || "";

    if (permanent && !reason) {
      return res.status(400).json({ message: "Reason is required for permanent deletion" });
    }

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // soft-delete by default
    if (!permanent) {
      business.status = "deleted";
      await business.save();
      await Audit.create({ operatorId: req.user.id, operatorEmail: req.user.email, action: "soft-delete", targetEntity: business._id, reason: reason || "soft deleted by admin" });
      return res.json({ message: "Business marked as deleted (soft)" });
    }

    // Permanently remove business and related data within a transaction
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const Invoice = (await import("../invoices/invoice.model.js")).default;
        const Customer = (await import("../customers/customer.model.js")).default;
        const Expense = (await import("../expenses/expense.model.js")).default;
        const PurchaseOrder = (await import("../purchaseOrders/purchaseOrder.model.js")).default;
        const Supplier = (await import("../suppliers/supplier.model.js")).default;

        await Product.deleteMany({ business: business._id }).session(session);
        await Invoice.deleteMany({ business: business._id }).session(session);
        await Sale.deleteMany({ business: business._id }).session(session);
        await Customer.deleteMany({ business: business._id }).session(session);
        await Expense.deleteMany({ business: business._id }).session(session);
        await PurchaseOrder.deleteMany({ business: business._id }).session(session);
        await Supplier.deleteMany({ business: business._id }).session(session);

        // Remove users belonging to this business
        await User.deleteMany({ business: business._id }).session(session);

        // Finally remove the business document
        await Business.deleteOne({ _id: business._id }).session(session);

        // create audit within transaction
        await Audit.create([{ operatorId: req.user.id, operatorEmail: req.user.email, action: "permanent-delete", targetEntity: business._id, reason }], { session });
      });

      res.json({ message: "Business permanently deleted" });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const archiveBusiness = async (req, res) => {
  try {
    const id = req.params.id;
    const reason = req.body.reason || "";
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });
    business.status = "archived";
    await business.save();
    await Audit.create({ operatorId: req.user.id, operatorEmail: req.user.email, action: "archive", targetEntity: business._id, reason: reason || "archived by admin" });
    res.json({ message: "Business archived" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const unarchiveBusiness = async (req, res) => {
  try {
    const id = req.params.id;
    const reason = req.body.reason || "";
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ message: "Business not found" });
    business.status = "active";
    await business.save();
    await Audit.create({ operatorId: req.user.id, operatorEmail: req.user.email, action: "unarchive", targetEntity: business._id, reason: reason || "unarchived by admin" });
    res.json({ message: "Business unarchived" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAffiliateSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({ globalAffiliateRate: 20 });
    }

    res.json({
      message: "Affiliate settings fetched successfully",
      settings: {
        ...settings.toObject(),
        commissionSchedule: settings.commissionSchedule || defaultCommissionSchedule
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateAffiliateSettings = async (req, res) => {
  try {
    const { globalAffiliateRate, commissionSchedule } = req.body;

    if (typeof globalAffiliateRate !== "number" || globalAffiliateRate < 0 || globalAffiliateRate > 100) {
      return res.status(400).json({ message: "globalAffiliateRate must be a number between 0 and 100" });
    }
    if (commissionSchedule !== undefined) {
      const validationError = validateCommissionSchedule(commissionSchedule);
      if (validationError) return res.status(400).json({ message: validationError });
    }

    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({
        globalAffiliateRate,
        ...(commissionSchedule ? { commissionSchedule } : {})
      });
    } else {
      settings.globalAffiliateRate = globalAffiliateRate;
      if (commissionSchedule !== undefined) settings.commissionSchedule = commissionSchedule;
      await settings.save();
    }

    res.json({
      message: "Affiliate settings updated successfully",
      settings: {
        ...settings.toObject(),
        commissionSchedule: settings.commissionSchedule || defaultCommissionSchedule
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPlanAccessSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.findOne().select("planAccess").lean();
    res.json({ planAccess: normalizePlanAccess(settings?.planAccess) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updatePlanAccessSettings = async (req, res) => {
  try {
    const validationError = validatePlanAccess(req.body?.planAccess);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();
    settings.planAccess = normalizePlanAccess(req.body.planAccess);
    await settings.save();

    res.json({
      message: "Plan access settings updated successfully",
      planAccess: normalizePlanAccess(settings.planAccess)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateAdminContact = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({ adminContact: { name, email, phone } });
    } else {
      settings.adminContact = { name: name || settings.adminContact?.name || "Support", email: email || settings.adminContact?.email || "support@marthington.com", phone: phone || settings.adminContact?.phone || "" };
      await settings.save();
    }
    res.json({ message: "Admin contact updated", adminContact: settings.adminContact });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listReportSubscriptions = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { isRemoved: { $ne: true } };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { recipientEmail: { $regex: search, $options: "i" } },
        { recipientName: { $regex: search, $options: "i" } }
      ];
    }

    const subscriptions = await ReportSubscription.find(query)
      .populate("business", "name industryType plan subscription isPro reportNotificationsEnabled")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const businesses = await Business.find({ status: { $ne: "deleted" } })
      .select("name owner email industryType plan subscription isPro reportNotificationsEnabled")
      .populate("owner", "name email")
      .lean();
    const configuredBusinessIds = new Set(subscriptions.map((item) => item.business?._id?.toString() || item.business?.toString()));
    const removedBusinessIds = new Set((await ReportSubscription.find({ isRemoved: true }).select("business").lean()).map((item) => item.business.toString()));
    const automaticRecipients = businesses
      .filter((business) => !configuredBusinessIds.has(business._id.toString()) && !removedBusinessIds.has(business._id.toString()))
      .map((business) => ({
        _id: null,
        isAutomatic: true,
        recipientEmail: business.owner?.email || business.email || "",
        recipientName: business.owner?.name || "",
        business: { _id: business._id, name: business.name, industryType: business.industryType, plan: business.subscription?.plan || "free", subscription: business.subscription, isPro: business.subscription?.plan === "pro" && business.subscription?.status === "active" },
        reportType: "overview",
        reportSections: ["summary", "sales", "expenses", "inventory", "staff", "paymentMethods"],
        frequency: "daily",
        sendTime: "18:00",
        weeklyDay: 1,
        monthlyDay: "last",
        timezone: "Africa/Lagos",
        status: business.subscription?.plan === "pro" && business.subscription?.status === "active" && business.reportNotificationsEnabled !== false ? "enabled" : "admin_disabled",
        isRemoved: false
      }));

    res.json({ subscriptions: [...subscriptions, ...automaticRecipients] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createReportSubscription = async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName = "",
      recipientPhone = "",
      whatsappOptInConfirmed = false,
      businessId,
      reportType = "overview",
      reportSections,
      frequency = "daily",
      channel = "email",
      sendTime = "18:00",
      weeklyDay = 1,
      monthlyDay = "last",
      timezone = "Africa/Lagos",
      status = "enabled",
      isRemoved = false
    } = req.body;

    if (!["email", "whatsapp", "both"].includes(channel)) {
      return res.status(400).json({ message: "A valid report delivery channel is required" });
    }
    if (["email", "both"].includes(channel) && (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail))) {
      return res.status(400).json({ message: "A valid recipient email is required" });
    }
    if (["whatsapp", "both"].includes(channel) && (!recipientPhone || whatsappOptInConfirmed !== true)) {
      return res.status(400).json({ message: "A WhatsApp number and confirmed recipient opt-in are required" });
    }
    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId) || !(await Business.exists({ _id: businessId }))) {
      return res.status(400).json({ message: "A valid business is required" });
    }

    const existingRemovedSubscription = await ReportSubscription.findOne({ business: businessId, recipientEmail, reportType, frequency, isRemoved: true });
    const createdSubscription = existingRemovedSubscription
      ? await ReportSubscription.findByIdAndUpdate(existingRemovedSubscription._id, {
        recipientName, recipientPhone, whatsappOptInConfirmed, whatsappOptInConfirmedAt: whatsappOptInConfirmed ? new Date() : null, channel, reportSections, sendTime, weeklyDay, monthlyDay, timezone, status, isRemoved: isRemoved === true, updatedBy: req.user.id
      }, { new: true, runValidators: true })
      : await ReportSubscription.create({
      recipientEmail,
      recipientName,
      recipientPhone,
      whatsappOptInConfirmed,
      whatsappOptInConfirmedAt: whatsappOptInConfirmed ? new Date() : null,
      business: businessId,
      reportType,
      ...(Array.isArray(reportSections) ? { reportSections } : {}),
      frequency,
      channel,
      sendTime,
      weeklyDay,
      monthlyDay,
      timezone,
      status,
      isRemoved: isRemoved === true,
      createdBy: req.user.id,
      updatedBy: req.user.id
      });

    const subscription = await ReportSubscription.findById(createdSubscription._id)
      .populate("business", "name industryType")
      .lean();

    res.status(201).json({ subscription });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This recipient already has that report schedule" });
    }
    res.status(500).json({ message: err.message });
  }
};

const updateReportSubscription = async (req, res) => {
  try {
    const allowedFields = ["recipientName", "recipientEmail", "recipientPhone", "whatsappOptInConfirmed", "channel", "reportType", "reportSections", "frequency", "sendTime", "weeklyDay", "monthlyDay", "timezone", "status"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No subscription changes supplied" });
    }

    const current = await ReportSubscription.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ message: "Report subscription not found" });
    const nextChannel = updates.channel || current.channel || "email";
    const nextEmail = updates.recipientEmail ?? current.recipientEmail;
    const nextPhone = updates.recipientPhone ?? current.recipientPhone;
    const nextOptIn = updates.whatsappOptInConfirmed ?? current.whatsappOptInConfirmed;
    if (["email", "both"].includes(nextChannel) && (!nextEmail || !/^\S+@\S+\.\S+$/.test(nextEmail))) {
      return res.status(400).json({ message: "A valid recipient email is required" });
    }
    if (["whatsapp", "both"].includes(nextChannel) && (!nextPhone || nextOptIn !== true)) {
      return res.status(400).json({ message: "A WhatsApp number and confirmed recipient opt-in are required" });
    }
    if (updates.whatsappOptInConfirmed !== undefined) {
      updates.whatsappOptInConfirmedAt = updates.whatsappOptInConfirmed ? new Date() : null;
    }
    if (updates.channel === "both" && current.lastSentAt) {
      if ((current.channel || "email") === "email" && !current.emailLastSentAt) updates.emailLastSentAt = current.lastSentAt;
      if (current.channel === "whatsapp" && !current.whatsappLastSentAt) updates.whatsappLastSentAt = current.lastSentAt;
    }

    updates.updatedBy = req.user.id;
    const subscription = await ReportSubscription.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate("business", "name industryType")
      .lean();

    if (!subscription) return res.status(404).json({ message: "Report subscription not found" });
    res.json({ subscription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeReportSubscription = async (req, res) => {
  try {
    const subscription = await ReportSubscription.findByIdAndUpdate(
      req.params.id,
      { isRemoved: true, status: "admin_disabled", updatedBy: req.user.id },
      { new: true }
    ).lean();
    if (!subscription) return res.status(404).json({ message: "Report recipient not found" });
    res.json({ message: "Report recipient removed", subscription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listReportDeliveryHistory = async (req, res) => {
  try {
    const subscription = await ReportSubscription.findById(req.params.id).select("_id").lean();
    if (!subscription) return res.status(404).json({ message: "Report subscription not found" });
    const deliveries = await ReportDeliveryLog.find({ subscription: subscription._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ deliveries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendReportSubscriptionTest = async (req, res) => {
  const startedAt = Date.now();
  const stage = (name, details = "") => console.log(`[report-test] ${name} ${Date.now() - startedAt}ms${details ? ` ${details}` : ""}`);
  let subscription = null;
  let currentStage = "subscription_lookup";
  const recordDelivery = async ({ channel, recipientEmail, recipientPhone, status, errorMessage = "", sentAt = null }) => {
    if (!subscription) return;
    try {
      await ReportDeliveryLog.create({
        subscription: subscription._id,
        business: subscription.business?._id || subscription.business,
        recipientEmail: recipientEmail || "",
        recipientPhone: recipientPhone || subscription.recipientPhone || "",
        channel,
        reportType: subscription.reportType,
        frequency: subscription.frequency,
        status,
        errorMessage,
        sentAt
      });
    } catch (logError) {
      console.error(`[report-test] delivery_log_failed ${logError.message}`);
    }
  };
  try {
    subscription = await ReportSubscription.findById(req.params.id).populate("business", "name").lean();
    if (!subscription) return res.status(404).json({ message: "Report subscription not found" });
    stage("subscription_loaded");

    const recipientEmail = req.body.recipientEmail || subscription.recipientEmail;
    const recipientName = req.body.recipientName || subscription.recipientName;
    const businessId = subscription.business?._id || subscription.business;
    currentStage = "report_data_collection";
    const { snapshot, periodLabel, counts } = await getReportSnapshot(subscription, businessId);
    stage("report_data_loaded", `sales=${counts.sales} transactions=${counts.transactions} products=${counts.products}`);
    currentStage = "snapshot_build";
    stage("snapshot_built");
    const channels = subscription.channel === "both" ? ["email", "whatsapp"] : [subscription.channel || "email"];
    const failures = [];
    for (const channel of channels) {
      try {
        if (channel === "email") {
          const token = jwt.sign({ subscriptionId: subscription._id.toString(), purpose: "report-unsubscribe" }, process.env.JWT_SECRET, { expiresIn: "10y" });
          const apiUrl = String(process.env.PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
          const sent = await sendReportEmail({
            recipientEmail,
            recipientName,
            businessName: subscription.business?.name || "Marthington BMS business",
            reportType: subscription.reportType,
            frequency: subscription.frequency,
            periodLabel,
            snapshot,
            unsubscribeUrl: `${apiUrl}/api/report-subscriptions/unsubscribe?token=${encodeURIComponent(token)}`
          });
          if (!sent) throw new Error(getEmailConfigStatus().lastError || "Email delivery failed");
        } else {
          if (!subscription.whatsappOptInConfirmed) throw new Error("WhatsApp opt-in has not been confirmed for this recipient.");
          await sendBusinessReportWhatsApp({
            subscription: { ...subscription, recipientName: subscription.recipientName || recipientName },
            businessName: subscription.business?.name || "Marthington BMS business",
            periodLabel,
            snapshot
          });
        }
        const deliveredAt = new Date();
        await ReportSubscription.findByIdAndUpdate(subscription._id, {
          lastSentAt: deliveredAt,
          [channel === "email" ? "emailLastSentAt" : "whatsappLastSentAt"]: deliveredAt
        });
        await recordDelivery({ channel, recipientEmail: channel === "email" ? recipientEmail : "", recipientPhone: subscription.recipientPhone, status: "sent", sentAt: new Date() });
      } catch (error) {
        failures.push(`${channel}: ${error.message}`);
        await recordDelivery({ channel, recipientEmail: channel === "email" ? recipientEmail : "", recipientPhone: subscription.recipientPhone, status: "failed", errorMessage: error.message });
      }
    }
    if (failures.length) {
      const errorMessage = failures.join("; ");
      await ReportSubscription.findByIdAndUpdate(subscription._id, { lastError: errorMessage });
      return res.status(503).json({ message: errorMessage });
    }
    await ReportSubscription.findByIdAndUpdate(subscription._id, { lastError: "" });
    res.json({ message: "Test report sent" });
  } catch (err) {
    stage("failed", `stage=${currentStage} error=${err.message}`);
    const errorMessage = `${currentStage}: ${err.message}`;
    if (subscription) {
      await ReportSubscription.findByIdAndUpdate(subscription._id, { lastError: errorMessage });
      await recordDelivery({ channel: subscription.channel === "both" ? "email" : subscription.channel || "email", errorMessage, status: "failed" });
    }
    res.status(500).json({ message: errorMessage });
  }
};

const getEmailHealth = async (req, res) => {
  const verified = await verifyEmailConfig();
  res.status(verified ? 200 : 503).json({ verified, email: getEmailConfigStatus() });
};

const listCommunicationDeliveries = async (_req, res) => {
  try {
    const deliveries = await CommunicationDelivery.find({})
      .populate("business", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ deliveries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendCommunicationMessage = async (req, res) => {
  const { businessIds, channel, subject = "", message, whatsappOptInConfirmed = false } = req.body || {};
  if (!Array.isArray(businessIds) || businessIds.length === 0 || businessIds.length > 50) {
    return res.status(400).json({ message: "Select between 1 and 50 businesses" });
  }
  if (!["email", "whatsapp"].includes(channel)) {
    return res.status(400).json({ message: "Choose a valid message channel" });
  }
  if (typeof message !== "string" || !message.trim() || message.length > 5000) {
    return res.status(400).json({ message: "Message must be between 1 and 5,000 characters" });
  }
  if (channel === "email" && (typeof subject !== "string" || !subject.trim() || subject.length > 200)) {
    return res.status(400).json({ message: "Email subject must be between 1 and 200 characters" });
  }
  if (channel === "whatsapp" && (message.length > 1024 || whatsappOptInConfirmed !== true)) {
    return res.status(400).json({ message: "WhatsApp messages require confirmed recipient opt-in and must be 1,024 characters or fewer" });
  }
  if (businessIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({ message: "One or more selected businesses are invalid" });
  }

  try {
    const uniqueIds = [...new Set(businessIds.map(String))];
    const businesses = await Business.find({ _id: { $in: uniqueIds }, status: { $ne: "deleted" } })
      .select("name email phone whatsapp owner")
      .populate("owner", "name email phone phoneNumber")
      .lean();
    if (businesses.length !== uniqueIds.length) {
      return res.status(400).json({ message: "A selected business no longer exists or is unavailable" });
    }

    const deliverToBusiness = async (business) => {
      const recipientName = business.owner?.name || "";
      const recipientEmail = business.owner?.email || business.email || "";
      const recipientPhone = business.whatsapp?.number || business.owner?.phoneNumber || business.owner?.phone || business.phone || "";
      let status = "sent";
      let errorMessage = "";
      try {
        if (channel === "email") {
          if (!recipientEmail) throw new Error("No recipient email address is available");
          const sent = await sendSubscriptionEmail({
            recipientEmail,
            recipientName,
            subject: subject.trim(),
            previewText: subject.trim(),
            bodyText: message
          });
          if (!sent) throw new Error("Email provider did not confirm delivery");
        } else {
          if (!recipientPhone) throw new Error("No WhatsApp number is available");
          await sendWhatsAppTemplate({
            to: recipientPhone,
            templateName: process.env.WHATSAPP_MESSAGE_TEMPLATE_NAME || "admin_communication",
            languageCode: process.env.WHATSAPP_MESSAGE_TEMPLATE_LANGUAGE || "en",
            bodyParameters: [recipientName || "there", business.name, message.trim()]
          });
        }
      } catch (error) {
        status = "failed";
        errorMessage = error.message || "Message delivery failed";
      }

      const delivery = await CommunicationDelivery.create({
        business: business._id,
        recipientName,
        recipientEmail,
        recipientPhone,
        channel,
        whatsappOptInConfirmed: channel === "whatsapp" && whatsappOptInConfirmed === true,
        whatsappOptInConfirmedAt: channel === "whatsapp" && whatsappOptInConfirmed === true ? new Date() : null,
        subject: channel === "email" ? subject.trim() : "",
        message: message.trim(),
        status,
        errorMessage,
        sentAt: status === "sent" ? new Date() : null,
        createdBy: req.user.id
      });
      return {
        _id: delivery._id,
        business: { _id: business._id, name: business.name },
        recipientName,
        channel,
        subject: delivery.subject,
        message: delivery.message,
        status,
        errorMessage,
        createdAt: delivery.createdAt
      };
    };
    const deliveries = [];
    for (let index = 0; index < businesses.length; index += 5) {
      const batch = businesses.slice(index, index + 5);
      deliveries.push(...await Promise.all(batch.map(deliverToBusiness)));
    }
    const failed = deliveries.filter((delivery) => delivery.status === "failed").length;
    res.status(failed ? 207 : 200).json({ sent: deliveries.length - failed, failed, deliveries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const unsubscribeReportSubscription = async (req, res) => {
  try {
    const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
    if (decoded.purpose !== "report-unsubscribe" || !decoded.subscriptionId) {
      return res.status(400).send("Invalid unsubscribe link");
    }

    await ReportSubscription.findByIdAndUpdate(decoded.subscriptionId, {
      status: "unsubscribed",
      updatedBy: null
    });

    res.send("You have been unsubscribed from scheduled reports.");
  } catch (err) {
    res.status(400).send("This unsubscribe link is invalid or expired.");
  }
};

const unsubscribeCampaignEmail = async (req, res) => {
  try {
    const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
    if (decoded.purpose !== "campaign-unsubscribe" || !decoded.userId) {
      return res.status(400).send("Invalid unsubscribe link");
    }

    await EmailPreference.findOneAndUpdate(
      { user: decoded.userId },
      { user: decoded.userId, marketingOptOut: true, optedOutAt: new Date(), source: "unsubscribe_link" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.send("You have been unsubscribed from promotional emails.");
  } catch (err) {
    res.status(400).send("This unsubscribe link is invalid or expired.");
  }
};

const campaignAudienceQuery = (audienceType, businessId) => {
  const query = { isActive: { $ne: false } };
  if (audienceType === "owners") query.role = "owner";
  if (audienceType === "staff") query.role = { $in: ["manager", "cashier", "staff"] };
  if (audienceType === "affiliates") query.role = "affiliate";
  if (audienceType === "business_users") query.business = businessId;
  return query;
};

const listEmailCampaigns = async (req, res) => {
  try {
    const campaigns = await EmailCampaign.find({})
      .populate("business", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ campaigns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEmailAudienceCount = async (req, res) => {
  try {
    const { audienceType = "all_users", businessId } = req.query;
    if (audienceType === "business_users" && (!businessId || !mongoose.Types.ObjectId.isValid(businessId))) {
      return res.status(400).json({ message: "A business is required for this audience" });
    }
    const query = campaignAudienceQuery(audienceType, businessId);
    query._id = { $nin: (await EmailPreference.find({ marketingOptOut: true }).select("user").lean()).map((item) => item.user) };
    const count = await User.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listEmailRegistry = async (req, res) => {
  try {
    const { search = "", role, businessId, marketingStatus = "all" } = req.query;
    const query = { isActive: { $ne: false } };
    if (role) query.role = role;
    if (businessId && mongoose.Types.ObjectId.isValid(businessId)) query.business = businessId;
    if (search) query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];

    const optedOutIds = (await EmailPreference.find({ marketingOptOut: true }).select("user").lean()).map((item) => item.user);
    if (marketingStatus === "enabled") query._id = { $nin: optedOutIds };
    if (marketingStatus === "disabled") query._id = { $in: optedOutIds };

    const users = await User.find(query)
      .select("name email role business isActive createdAt")
      .populate("business", "name")
      .sort({ createdAt: -1 })
      .lean();
    const preferenceMap = new Map((await EmailPreference.find({ user: { $in: users.map((user) => user._id) } }).lean()).map((item) => [item.user.toString(), item]));

    res.json({
      users: users.map((user) => ({
        ...user,
        marketingOptOut: Boolean(preferenceMap.get(user._id.toString())?.marketingOptOut),
        marketingOptOutAt: preferenceMap.get(user._id.toString())?.optedOutAt || null
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateEmailPreference = async (req, res) => {
  try {
    const { marketingOptOut } = req.body;
    if (typeof marketingOptOut !== "boolean") return res.status(400).json({ message: "marketingOptOut must be boolean" });
    const user = await User.findById(req.params.userId).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });
    const preference = await EmailPreference.findOneAndUpdate(
      { user: user._id },
      { user: user._id, marketingOptOut, optedOutAt: marketingOptOut ? new Date() : null, source: "admin" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ preference });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendCampaignTestEmail = async (req, res) => {
  try {
    const { email, name = "there" } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "A valid test email is required" });
    const campaign = await EmailCampaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    const sent = await sendCampaignEmail({
      recipientEmail: email,
      recipientName: name,
      subject: `[TEST] ${campaign.subject}`,
      previewText: campaign.previewText,
      bodyHtml: campaign.bodyHtml,
      footerText: campaign.footerText,
      footerAddress: campaign.footerAddress,
      userId: req.user.id
    });
    if (!sent) return res.status(503).json({ message: "Email transporter unavailable or delivery failed" });
    res.json({ message: "Test email sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createEmailCampaign = async (req, res) => {
  try {
    const {
      name,
      subject,
      previewText = "",
      bodyHtml,
      footerText = "Marthington BMS | Business management, made clearer.",
      footerAddress = "",
      audienceType = "all_users",
      businessId = null,
      scheduledFor = null
    } = req.body;

    if (!name?.trim() || !subject?.trim() || !bodyHtml?.trim()) {
      return res.status(400).json({ message: "Campaign name, subject, and message are required" });
    }
    if (audienceType === "business_users" && (!businessId || !mongoose.Types.ObjectId.isValid(businessId))) {
      return res.status(400).json({ message: "A business is required for this audience" });
    }
    if (scheduledFor && Number.isNaN(new Date(scheduledFor).getTime())) {
      return res.status(400).json({ message: "scheduledFor must be a valid date" });
    }

    const campaign = await EmailCampaign.create({
      name,
      subject,
      previewText,
      bodyHtml,
      footerText,
      footerAddress,
      audienceType,
      business: businessId || null,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      status: scheduledFor ? "scheduled" : "draft",
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    const result = await EmailCampaign.findById(campaign._id)
      .populate("business", "name")
      .lean();
    res.status(201).json({ campaign: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateEmailCampaign = async (req, res) => {
  try {
    const allowedFields = ["name", "subject", "previewText", "bodyHtml", "footerText", "footerAddress", "audienceType", "business", "scheduledFor"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.scheduledFor) {
      updates.scheduledFor = new Date(updates.scheduledFor);
      updates.status = "scheduled";
    }
    updates.updatedBy = req.user.id;
    const campaign = await EmailCampaign.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["draft", "scheduled"] } },
      updates,
      { new: true, runValidators: true }
    ).populate("business", "name").lean();
    if (!campaign) return res.status(404).json({ message: "Editable campaign not found" });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelEmailCampaign = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["draft", "scheduled"] } },
      { status: "cancelled", updatedBy: req.user.id },
      { new: true }
    ).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign cannot be cancelled" });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const retryEmailCampaign = async (req, res) => {
  try {
    const campaign = await EmailCampaign.findOneAndUpdate(
      { _id: req.params.id, status: "failed" },
      { status: "scheduled", scheduledFor: new Date(), updatedBy: req.user.id },
      { new: true }
    ).lean();
    if (!campaign) return res.status(404).json({ message: "Failed campaign not found" });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= AFFILIATE ADMIN ACTIONS =================
const listAffiliates = async (req, res) => {
  try {
    const affiliates = await User.find({ affiliateCode: { $exists: true, $ne: null } })
      .select("name email affiliateCode walletBalance totalEarned createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const affiliateCodes = affiliates
      .map((affiliate) => affiliate.affiliateCode)
      .filter(Boolean);

    const [clickStats, conversionStats, settings] = await Promise.all([
      affiliateCodes.length
        ? AffiliateClick.aggregate([
            { $match: { affiliateCode: { $in: affiliateCodes } } },
            { $group: { _id: "$affiliateCode", clicks: { $sum: 1 } } }
          ])
        : [],
      affiliateCodes.length
        ? AffiliatePayout.aggregate([
            {
              $match: {
                affiliateCode: { $in: affiliateCodes },
                business: { $ne: null },
                status: "credited"
              }
            },
            { $group: { _id: "$affiliateCode", conversions: { $sum: 1 } } }
          ])
        : [],
      SystemSettings.findOne()
    ]);

    const clickMap = new Map(clickStats.map((entry) => [entry._id, Number(entry.clicks || 0)]));
    const conversionMap = new Map(conversionStats.map((entry) => [entry._id, Number(entry.conversions || 0)]));

    const enrichedAffiliates = affiliates.map((affiliate) => {
      const affiliateCode = affiliate.affiliateCode || "";
      const clicks = Number(clickMap.get(affiliateCode) || 0);
      const conversions = Number(conversionMap.get(affiliateCode) || 0);
      const conversionRate = clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : 0;

      return {
        ...affiliate,
        clicks,
        conversions,
        conversionRate
      };
    });

    const globalRate = Number(settings?.globalAffiliateRate ?? 20);

    const totalPaid = await WithdrawalHistory.aggregate([
      { $match: { status: "Approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const pendingPayouts = await PayoutRequest.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amountRequested" }, count: { $sum: 1 } } }
    ]);

    const stats = {
      totalPartners: enrichedAffiliates.length,
      pendingPayouts: Number(pendingPayouts[0]?.total || 0),
      pendingPayoutRequests: Number(pendingPayouts[0]?.count || 0),
      totalPaidCommissions: Number(totalPaid[0]?.total || 0)
    };

    res.json({ affiliates: enrichedAffiliates, globalRate, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPartnerPayoutHistory = async (req, res) => {
  try {
    const partnerId = req.params.id;
    const history = await WithdrawalHistory.find({ partnerId })
      .sort({ date: -1 })
      .lean();

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getWithdrawalHistory = async (req, res) => {
  try {
    const history = await WithdrawalHistory.find({})
      .populate("partnerId", "name email affiliateCode")
      .sort({ date: -1 })
      .lean();

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= OPERATION LOGS (IMPORTS) =================
const listOperationLogs = async (req, res) => {
  try {
    const {
      status,
      search,
      operationType,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortDir = "desc",
      from,
      to,
      user,
      branch
    } = req.query;

    const q = {};
    if (status) q.status = status;
    if (operationType) q.operationType = operationType;
    if (user && mongoose.Types.ObjectId.isValid(user)) q.user = mongoose.Types.ObjectId(user);
    if (branch && mongoose.Types.ObjectId.isValid(branch)) q.branch = mongoose.Types.ObjectId(branch);

    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }

    if (search) {
      const or = [];
      or.push({ operationType: { $regex: search, $options: "i" } });
      or.push({ error: { $regex: search, $options: "i" } });
      if (mongoose.Types.ObjectId.isValid(search)) {
        try {
          const oid = mongoose.Types.ObjectId(search);
          or.push({ _id: oid });
          or.push({ branch: oid });
          or.push({ business: oid });
          or.push({ user: oid });
        } catch (e) {
          // ignore
        }
      }
      q.$or = or;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await OperationLog.countDocuments(q);

    // validate sortBy against allowed fields
    const allowedSort = ["createdAt", "status", "operationType"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortDir === "asc" ? 1 : -1;

    const logs = await OperationLog.find(q)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({ total, page: Number(page), limit: Number(limit), logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const retryOperationLog = async (req, res) => {
  try {
    const id = req.params.id;
    const log = await OperationLog.findById(id);
    if (!log) return res.status(404).json({ message: "Operation log not found" });
    if (log.status !== "failed") return res.status(400).json({ message: "Only failed jobs can be retried" });

    // reset status and enqueue job
    log.status = "pending";
    log.error = undefined;
    log.metadata = {};
    await log.save();

    try {
      await importQueue.add({ jobId: id.toString(), businessId: log.business.toString(), branchId: log.branch?.toString(), userId: log.user?.toString() });
    } catch (err) {
      console.error("Retry enqueue failed; falling back to inline processing:", err.message || err);
      if (importQueue.addInline) {
        await importQueue.addInline({ jobId: id.toString(), businessId: log.business.toString(), branchId: log.branch?.toString(), userId: log.user?.toString() });
      }
    }

    res.json({ message: "Retry enqueued", jobId: id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOperationLog = async (req, res) => {
  try {
    const id = req.params.id;
    const log = await OperationLog.findById(id).lean();
    if (!log) return res.status(404).json({ message: "Operation log not found" });
    res.json({ log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const processAffiliatePayout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const affiliateId = req.params.id;
    const affiliate = await User.findById(affiliateId).session(session);
    if (!affiliate) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Affiliate not found" });
    }

    const amount = Number(affiliate.walletBalance || 0);
    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "No balance to payout" });
    }

    const payout = await PayoutRequest.create({
      partnerId: affiliate._id,
      affiliate: affiliate._id,
      affiliateCode: affiliate.affiliateCode || "",
      amountRequested: amount,
      status: "paid",
      processedAt: new Date()
    }, { session });

    await User.findByIdAndUpdate(
      affiliate._id,
      { $inc: { walletBalance: -amount } },
      { session }
    );

    await WithdrawalHistory.create([{
      partnerId: affiliate._id,
      payoutRequestId: payout._id,
      amount,
      status: "Approved",
      note: "Settled by admin",
      date: new Date()
    }], { session });

    await SystemSettings.findOneAndUpdate(
      {},
      { $inc: { totalCommissionsCleared: amount } },
      { session, upsert: true, new: true }
    );

    await Notification.create([{
      recipient: affiliate._id,
      type: "payout_settled",
      title: "Payout Processed Successfully",
      message: `Your payout of ₦${amount.toLocaleString()} has been approved and processed to your bank account.`,
      amount,
      actionUrl: "/partners/dashboard"
    }], { session });

    await session.commitTransaction();

    res.json({ message: "Payout cleared", amount, payoutId: payout._id });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ================= PAYOUT REQUESTS =================
const listPayoutRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const q = {};
    if (status) q.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const total = await PayoutRequest.countDocuments(q);
    const requests = await PayoutRequest.find(q)
      .populate("affiliate", "name email phone address affiliateCode paymentDetails walletBalance bankName accountNumber accountName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({ total, page: Number(page), limit: Number(limit), requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const settlePayoutRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payoutId = req.params.id;
    
    // Step 1: Fetch the payout request to validate and extract partnerId
    const payout = await PayoutRequest.findById(payoutId).session(session);
    if (!payout) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Payout request not found" });
    }

    if (payout.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Request already processed" });
    }

    // Step 2: Extract and preserve partnerId from the found document
    const partnerId = payout.partnerId || payout.affiliate;
    if (!partnerId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Payout request missing partner reference" });
    }

    const amountRequested = Number(payout.amountRequested || 0);
    if (amountRequested <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid payout amount" });
    }

    // Step 3: Find the Partner and validate balance
    const partner = await User.findById(partnerId).session(session);
    if (!partner) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Partner not found" });
    }

    if (Number(partner.walletBalance || 0) < amountRequested) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient wallet balance for this payout" });
    }

    // Step 4: Update PayoutRequest status using findByIdAndUpdate (safer than save)
    // This ensures partnerId is preserved and all required fields are maintained
    const updatedPayout = await PayoutRequest.findByIdAndUpdate(
      payoutId,
      {
        status: "paid",
        processedAt: new Date(),
        adminNote: req.body.note || ""
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedPayout) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Failed to update payout request" });
    }

    // Step 5: Deduct from partner wallet balance
    await User.findByIdAndUpdate(
      partnerId,
      { $inc: { walletBalance: -amountRequested } },
      { session }
    );

    // Step 6: Create WithdrawalHistory record
    await WithdrawalHistory.create([
      {
        partnerId: partnerId,
        payoutRequestId: payout._id,
        amount: amountRequested,
        status: "Approved",
        note: req.body.note || "",
        date: new Date()
      }
    ], { session });

    await SystemSettings.findOneAndUpdate(
      {},
      { $inc: { totalCommissionsCleared: amountRequested } },
      { session, upsert: true, new: true }
    );

    // Step 7: Create notification for partner
    await Notification.create([
      {
        recipient: partnerId,
        type: "payout_approved",
        title: "Withdrawal Approved",
        message: `Your withdrawal request of ₦${amountRequested.toLocaleString()} has been approved and sent to your bank account.`,
        amount: amountRequested,
        payoutRequestId: payout._id,
        actionUrl: "/partners/dashboard"
      }
    ], { session });

    await session.commitTransaction();

    res.json({ message: "Payout settled successfully", payout: updatedPayout });
  } catch (err) {
    await session.abortTransaction();
    console.error("SETTLE PAYOUT ERROR:", err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

const rejectPayoutRequest = async (req, res) => {
  try {
    const id = req.params.id;
    const payout = await PayoutRequest.findById(id);
    if (!payout) return res.status(404).json({ message: "Payout request not found" });
    if (payout.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    payout.status = "rejected";
    payout.processedAt = new Date();
    payout.adminNote = req.body.note || "Rejected by admin";
    await payout.save();

    await WithdrawalHistory.create({
      partnerId: payout.partnerId || payout.affiliate,
      payoutRequestId: payout._id,
      amount: Number(payout.amountRequested || 0),
      status: "Rejected",
      note: payout.adminNote,
      date: new Date()
    });

    await Notification.create({
      recipient: payout.partnerId || payout.affiliate,
      type: "payout_rejected",
      title: "Withdrawal Rejected",
      message: `Your withdrawal request of ₦${Number(payout.amountRequested || 0).toLocaleString()} was rejected. ${payout.adminNote}`,
      amount: Number(payout.amountRequested || 0),
      payoutRequestId: payout._id,
      actionUrl: "/partners/dashboard"
    });

    res.json({ message: "Payout rejected", payout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approvePayoutRequest = async (req, res) => {
  return settlePayoutRequest(req, res);
};

// 🔥 PARTNERS LEDGER WITH FULL PROFILE DETAILS
const getPartnersLedger = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build search query
    const searchQuery = search ? {
      $or: [
        { "affiliate.name": { $regex: search, $options: "i" } },
        { "affiliate.email": { $regex: search, $options: "i" } },
        { "affiliate.phone": { $regex: search, $options: "i" } },
        { "affiliate.affiliateCode": { $regex: search, $options: "i" } }
      ]
    } : {};

    // Use aggregation to populate and get all affiliate details
    const ledger = await AffiliatePayout.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "affiliate",
          foreignField: "_id",
          as: "affiliateData"
        }
      },
      { $unwind: { path: "$affiliateData", preserveNullAndEmptyArrays: true } },
      {
        $match: searchQuery
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: Number(limit)
      },
      {
        $project: {
          _id: 1,
          affiliate: "$affiliateData._id",
          affiliateCode: 1,
          name: "$affiliateData.name",
          email: "$affiliateData.email",
          phone: { $ifNull: ["$affiliateData.phoneNumber", "$affiliateData.phone"] },
          address: "$affiliateData.address",
          walletBalance: "$affiliateData.walletBalance",
          totalEarned: "$affiliateData.totalEarned",
          bankName: { $ifNull: ["$affiliateData.bankName", "$affiliateData.paymentDetails.bankName"] },
          accountNumber: { $ifNull: ["$affiliateData.accountNumber", "$affiliateData.paymentDetails.accountNumber"] },
          accountName: { $ifNull: ["$affiliateData.accountName", "$affiliateData.paymentDetails.accountName"] },
          amountPaid: 1,
          commissionEarned: 1,
          status: 1,
          transactionDate: 1,
          createdAt: 1
        }
      }
    ]);

    const total = await AffiliatePayout.countDocuments();

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      ledger
    });
  } catch (err) {
    console.error("GET PARTNERS LEDGER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// 🔥 SETTLE BALANCE - ATOMIC TRANSACTION
const settleBalance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { affiliateId, amount, note } = req.body;

    if (!affiliateId || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid affiliate ID or amount" });
    }

    const affiliate = await User.findById(affiliateId).session(session);
    if (!affiliate) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Affiliate not found" });
    }

    if (Number(affiliate.walletBalance || 0) < Number(amount)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const settledAmount = Number(amount);

    await User.findByIdAndUpdate(
      affiliateId,
      { $inc: { walletBalance: -settledAmount } },
      { session }
    );

    const payout = await PayoutRequest.create([{
      partnerId: affiliateId,
      affiliate: affiliateId,
      affiliateCode: affiliate.affiliateCode || "",
      amountRequested: settledAmount,
      status: "paid",
      adminNote: note || "Settled by admin",
      processedAt: new Date()
    }], { session });

    await WithdrawalHistory.create([
      {
        partnerId: affiliateId,
        payoutRequestId: payout[0]._id,
        amount: settledAmount,
        status: "Approved",
        date: new Date(),
        note: note || ""
      }
    ], { session });

    const settings = await SystemSettings.findOne({}).session(session);
    if (settings) {
      settings.globalAffiliateRate = Number(settings.globalAffiliateRate ?? 20);
      await settings.save({ session });
    }

    await SystemSettings.findOneAndUpdate(
      {},
      { $inc: { totalCommissionsCleared: settledAmount } },
      { session, upsert: true, new: true }
    );

    await Notification.create(
      [{
        recipient: affiliateId,
        type: "payout_settled",
        title: "Payout Processed Successfully",
        message: `Your payout of ₦${settledAmount.toLocaleString()} has been approved and processed to your bank account (${affiliate.paymentDetails?.bankName || "Your Bank"}). ${note ? `Note: ${note}` : ""}`,
        amount: settledAmount,
        payoutRequestId: payout[0]._id,
        actionUrl: "/partners/dashboard"
      }],
      { session }
    );

    await session.commitTransaction();

    res.json({
      message: "Balance settled successfully",
      affiliate: {
        name: affiliate.name,
        email: affiliate.email,
        newWalletBalance: Number(affiliate.walletBalance || 0) - settledAmount,
        settledAmount
      }
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("SETTLE BALANCE ERROR:", err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// 🔥 BUSINESS DETAILS (FINAL FIX — NO MORE 500)
const getBusinessDetails = async (req, res) => {
  try {
    const businessId = req.params.id;

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    const products = await Product.find({ business: businessId })
      .select("name price stock createdAt") // ✅ FIXED
      .sort({ createdAt: -1 });

    const sales = await Sale.find({ business: businessId })
      .select("totalAmount createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    const users = await User.find({ business: businessId })
      .select("name email role createdAt");

    res.json({
      business: formatBusiness(business),
      products: products || [],
      sales: sales || [],
      users: users || []
    });

  } catch (err) {
    console.error("🔥 ADMIN BUSINESS ERROR:", err);
    res.status(500).json({
      message: "Failed to load business"
    });
  }
};

const updateBusinessOwnerPassword = async (req, res) => {
  const password = req.body?.password;
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    const business = await Business.findById(req.params.id).select("_id owner");
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    const owner = business.owner
      ? await User.findOne({ _id: business.owner, business: business._id })
      : await User.findOne({ business: business._id, role: "owner" });
    if (!owner) {
      return res.status(404).json({ message: "Business owner account not found." });
    }

    owner.password = await bcrypt.hash(password, 10);
    owner.refreshToken = null;
    await owner.save();

    return res.json({ message: "Business owner password updated." });
  } catch (error) {
    console.error("UPDATE BUSINESS OWNER PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Could not update business owner password." });
  }
};

const updateBusinessUserPassword = async (req, res) => {
  const password = req.body?.password;
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    const business = await Business.findById(req.params.id).select("_id");
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    const user = await User.findOne({ _id: req.params.userId, business: business._id });
    if (!user) {
      return res.status(404).json({ message: "User not found in this business." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.refreshToken = null;
    await user.save();

    return res.json({ message: "User password updated." });
  } catch (error) {
    console.error("UPDATE BUSINESS USER PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Could not update user password." });
  }
};

export default {
  getOverview,
  getRevenue,
  listBusinesses,
  listSubscriptions,
  getSubscriptionEmailAudience,
  listSubscriptionEmailDrafts,
  saveSubscriptionEmailDraft,
  sendSubscriptionEmailDraft,
  getSubscriptionEmailCampaign,
  updateSubscription,
  getBusinessDetails,
  updateBusinessOwnerPassword,
  updateBusinessUserPassword,
  getAffiliateSettings,
  updateAffiliateSettings,
  getPlanAccessSettings,
  updatePlanAccessSettings
  ,
  // business controls
  suspendBusiness,
  unsuspendBusiness,
  deleteBusiness,
  archiveBusiness,
  unarchiveBusiness,
  updateAdminContact,
  listReportSubscriptions,
  createReportSubscription,
  updateReportSubscription,
  removeReportSubscription,
  listReportDeliveryHistory,
  sendReportSubscriptionTest,
  getEmailHealth,
  listCommunicationDeliveries,
  sendCommunicationMessage,
  unsubscribeReportSubscription,
  unsubscribeCampaignEmail,
  listEmailCampaigns,
  getEmailAudienceCount,
  listEmailRegistry,
  updateEmailPreference,
  sendCampaignTestEmail,
  createEmailCampaign,
  updateEmailCampaign,
  cancelEmailCampaign,
  retryEmailCampaign,
  // affiliates
  listAffiliates,
  getPartnerPayoutHistory,
  getWithdrawalHistory,
  processAffiliatePayout,
  // payouts
  listPayoutRequests,
  settlePayoutRequest,
  approvePayoutRequest,
  rejectPayoutRequest,
  // ledger and settlement
  getPartnersLedger,
  settleBalance,
  // operation logs
  listOperationLogs,
  retryOperationLog,
  getOperationLog
};
