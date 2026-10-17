import Business from "../businesses/business.model.js";
import SupportConversation from "./supportConversation.model.js";
import { getBusinessPlanAccess } from "../subscriptions/planAccess.js";
import { getAssistantAnswer } from "./chatAssistant.js";

const validModes = new Set(["assistant", "support"]);
const isSuperAdmin = (user) => user?.accountRole === "super_admin" || user?.role === "super_admin";

const getAccessibleBusiness = async (req, res) => {
  if (!req.user.businessId) {
    res.status(400).json({ message: "Select a business workspace before opening chat." });
    return null;
  }
  const business = await Business.findById(req.user.businessId)
    .select("_id subscription")
    .lean();
  if (!business) {
    res.status(404).json({ message: "Business not found." });
    return null;
  }
  if (!isSuperAdmin(req.user)) {
    const access = await getBusinessPlanAccess(business);
    if (access.features.businessChat !== true) {
      res.status(403).json({ message: "Business chat is not enabled for this plan." });
      return null;
    }
  }
  return business;
};

const getChatAccess = async (req, res) => {
  try {
    if (!req.user.businessId) {
      return res.json({ enabled: isSuperAdmin(req.user), requiresBusiness: true });
    }
    const business = await Business.findById(req.user.businessId).select("_id subscription").lean();
    if (!business) return res.status(404).json({ message: "Business not found." });
    if (isSuperAdmin(req.user)) return res.json({ enabled: true, requiresBusiness: false });
    const access = await getBusinessPlanAccess(business);
    return res.json({ enabled: access.features.businessChat === true, requiresBusiness: false });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not check chat access." });
  }
};

const getThread = async (req, res) => {
  try {
    if (!validModes.has(req.params.mode)) return res.status(400).json({ message: "Unknown chat mode." });
    const business = await getAccessibleBusiness(req, res);
    if (!business) return;
    const conversation = await SupportConversation.findOne({ business: business._id, mode: req.params.mode }).lean();
    if (conversation && req.params.mode === "support" && conversation.unreadForUser) {
      await SupportConversation.updateOne({ _id: conversation._id }, { $set: { unreadForUser: false } });
      conversation.unreadForUser = false;
    }
    return res.json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not load chat." });
  }
};

const sendUserMessage = async (req, res) => {
  try {
    if (!validModes.has(req.params.mode)) return res.status(400).json({ message: "Unknown chat mode." });
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body || body.length > 2000) {
      return res.status(400).json({ message: "Message must be between 1 and 2,000 characters." });
    }
    const business = await getAccessibleBusiness(req, res);
    if (!business) return;

    let conversation = await SupportConversation.findOne({ business: business._id, mode: req.params.mode });
    if (!conversation) {
      try {
        conversation = await SupportConversation.create({ business: business._id, mode: req.params.mode });
      } catch (error) {
        if (error.code !== 11000) throw error;
        conversation = await SupportConversation.findOne({ business: business._id, mode: req.params.mode });
      }
    }
    const now = new Date();
    conversation.messages.push({
      senderId: req.user.id,
      senderRole: "user",
      senderName: req.user.name,
      body,
      createdAt: now
    });

    if (req.params.mode === "assistant") {
      const canViewBusinessData = req.user.role === "owner" || isSuperAdmin(req.user);
      const answer = await getAssistantAnswer({
        businessId: business._id,
        branchId: !canViewBusinessData ? req.user.branchId || null : null,
        branchScoped: !canViewBusinessData,
        question: body,
        permissions: {
          canViewProducts: canViewBusinessData || req.user.permissions?.canViewProducts === true,
          canViewCustomers: canViewBusinessData || req.user.permissions?.canViewCustomers === true,
          canViewInvoices: canViewBusinessData || req.user.permissions?.canViewInvoices === true
        }
      });
      conversation.messages.push({
        senderRole: "assistant",
        senderName: "Business assistant",
        body: answer,
        createdAt: new Date()
      });
      conversation.unreadForAdmin = true;
    } else {
      conversation.unreadForAdmin = true;
    }
    if (conversation.messages.length > 300) conversation.messages = conversation.messages.slice(-300);
    conversation.lastSender = req.user.id;
    conversation.lastMessageAt = now;
    await conversation.save();
    return res.status(201).json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not send chat message." });
  }
};

const ensureAdmin = (req, res) => {
  if (!isSuperAdmin(req.user)) {
    res.status(403).json({ message: "Superadmin access required." });
    return false;
  }
  return true;
};

const listAdminThreads = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const query = {};
    if (validModes.has(req.query.mode)) query.mode = req.query.mode;
    const conversations = await SupportConversation.find(query)
      .populate("business", "name")
      .populate("lastSender", "name email")
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();
    return res.json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not load business chats." });
  }
};

const getAdminThread = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const conversation = await SupportConversation.findById(req.params.id)
      .populate("business", "name")
      .populate("lastSender", "name email")
      .lean();
    if (!conversation) return res.status(404).json({ message: "Chat thread not found." });
    await SupportConversation.updateOne({ _id: conversation._id }, { $set: { unreadForAdmin: false } });
    conversation.unreadForAdmin = false;
    return res.json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not load chat thread." });
  }
};

const replyAsAdmin = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body || body.length > 2000) {
      return res.status(400).json({ message: "Message must be between 1 and 2,000 characters." });
    }
    const conversation = await SupportConversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Chat thread not found." });
    if (conversation.mode !== "support") {
      return res.status(400).json({ message: "Automated assistant threads are read-only in Communications." });
    }
    conversation.messages.push({
      senderId: req.user.id,
      senderRole: "super_admin",
      senderName: req.user.name || "Support",
      body,
      createdAt: new Date()
    });
    if (conversation.messages.length > 300) conversation.messages = conversation.messages.slice(-300);
    conversation.lastSender = req.user.id;
    conversation.lastMessageAt = new Date();
    conversation.unreadForAdmin = false;
    conversation.unreadForUser = true;
    conversation.status = "open";
    await conversation.save();
    return res.json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not send support reply." });
  }
};

export default {
  getChatAccess,
  getThread,
  sendUserMessage,
  listAdminThreads,
  getAdminThread,
  replyAsAdmin
};
