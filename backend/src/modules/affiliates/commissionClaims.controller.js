import mongoose from "mongoose";
import Business from "../businesses/business.model.js";
import Notification from "../notifications/notification.model.js";
import SystemSettings from "../admin/systemSettings.model.js";
import User from "../users/user.model.js";
import CommissionClaim from "./commissionClaim.model.js";
import { getCommissionScheduleItemKey } from "./commissionSchedule.js";

const agentClaimList = async (req, res) => {
  try {
    const agent = await User.findById(req.user?._id).select("affiliateCode");
    if (!agent?.affiliateCode) {
      return res.status(403).json({ message: "Agent mode is not active for this account." });
    }

    const claims = await CommissionClaim.find({ affiliate: agent._id })
      .populate("business", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ claims });
  } catch (error) {
    console.error("LIST AGENT COMMISSION CLAIMS ERROR:", error);
    return res.status(500).json({ message: "Could not load commission claims." });
  }
};

const createAgentCpaClaim = async (req, res) => {
  try {
    const agent = await User.findById(req.user?._id).select("affiliateCode");
    if (!agent?.affiliateCode) {
      return res.status(403).json({ message: "Agent mode is not active for this account." });
    }

    const { businessId, action, evidence } = req.body || {};
    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({ message: "Choose a valid referred business." });
    }
    if (typeof evidence !== "string" || evidence.trim().length < 10 || evidence.length > 2000) {
      return res.status(400).json({ message: "Provide at least 10 characters of evidence or context (maximum 2,000)." });
    }

    const settings = await SystemSettings.findOne().select("commissionSchedule").lean();
    const configuredAction = settings?.commissionSchedule?.cpaActions?.find((item) =>
      item.active !== false && getCommissionScheduleItemKey(item) === action
    );
    if (!configuredAction || Number(configuredAction.flatFee) <= 0) {
      return res.status(400).json({ message: "That CPA action is not currently active or payable." });
    }

    const business = await Business.findOne({
      _id: businessId,
      referredBy: agent.affiliateCode
    }).select("_id name");
    if (!business) {
      return res.status(404).json({ message: "The selected business is not attributed to your agent account." });
    }

    const claimKey = `cpa:${agent._id}:${business._id}:${action}`;
    const [claim] = await CommissionClaim.create([{
      claimKey,
      affiliate: agent._id,
      affiliateCode: agent.affiliateCode,
      business: business._id,
      kind: "cpa",
      actionKey: action,
      title: configuredAction.name,
      description: configuredAction.description || "",
      amount: Number(configuredAction.flatFee),
      evidence: evidence.trim()
    }]);
    return res.status(201).json({ message: "CPA claim submitted for admin review.", claim });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A claim for this action and business has already been submitted." });
    }
    console.error("CREATE AGENT CPA CLAIM ERROR:", error);
    return res.status(500).json({ message: "Could not submit the CPA claim." });
  }
};

const listAdminCommissionClaims = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    if (!["pending", "approved", "rejected", "all"].includes(status)) {
      return res.status(400).json({ message: "status must be pending, approved, rejected, or all." });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const filter = status === "all" ? {} : { status };
    const [claims, total] = await Promise.all([
      CommissionClaim.find(filter)
        .populate("affiliate", "name email affiliateCode")
        .populate("business", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CommissionClaim.countDocuments(filter)
    ]);
    return res.json({ claims, total, page, limit });
  } catch (error) {
    console.error("LIST ADMIN COMMISSION CLAIMS ERROR:", error);
    return res.status(500).json({ message: "Could not load commission claims." });
  }
};

const processAdminCommissionClaim = async (req, res) => {
  const { decision } = req.params;
  if (!["approve", "reject"].includes(decision)) {
    return res.status(404).json({ message: "Unknown commission claim action." });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid commission claim id." });
  }
  if (req.body?.note !== undefined && (typeof req.body.note !== "string" || req.body.note.length > 1000)) {
    return res.status(400).json({ message: "note must be text no longer than 1,000 characters." });
  }
  const note = (req.body?.note || "").trim();
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const claim = await CommissionClaim.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        $set: {
          status: decision === "approve" ? "approved" : "rejected",
          adminNote: note,
          processedBy: req.user._id,
          processedAt: new Date()
        }
      },
      { new: true, session, runValidators: true }
    );
    if (!claim) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Pending commission claim not found or already processed." });
    }

    const status = decision === "approve" ? "approved" : "rejected";
    if (status === "approved") {
      const update = await User.updateOne(
        { _id: claim.affiliate },
        { $inc: { walletBalance: claim.amount, totalEarned: claim.amount } },
        { session }
      );
      if (update.matchedCount !== 1) throw new Error("Agent for this commission claim no longer exists.");
    }

    await Notification.create([{
      recipient: claim.affiliate,
      type: "general",
      title: status === "approved" ? "Supplemental commission approved" : "Supplemental commission claim rejected",
      message: status === "approved"
        ? `Your ${claim.title} claim was approved and ₦${Number(claim.amount).toLocaleString()} was added to your available earnings.`
        : `Your ${claim.title} claim was rejected.${note ? ` Admin note: ${note}` : ""}`,
      amount: status === "approved" ? claim.amount : null,
      actionUrl: "/partners/commission"
    }], { session });

    await session.commitTransaction();
    return res.json({ message: `Commission claim ${status}.`, claim });
  } catch (error) {
    if (session?.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("ABORT COMMISSION CLAIM TRANSACTION ERROR:", abortError);
      }
    }
    console.error("PROCESS ADMIN COMMISSION CLAIM ERROR:", error);
    return res.status(500).json({ message: "Could not process the commission claim." });
  } finally {
    await session?.endSession();
  }
};

export {
  agentClaimList,
  createAgentCpaClaim,
  listAdminCommissionClaims,
  processAdminCommissionClaim
};
