import Business from "./business.model.js";
import cloudinary from "../../utils/cloudinary.js";

// 🔥 NORMALIZE BUSINESS RESPONSE (SINGLE SOURCE OF TRUTH)
const formatBusiness = (business) => {
  const obj = business?.toObject ? business.toObject() : business || {};
  const industryType = obj.industryType || "retail";
  const businessType = obj.businessType || "general_services";
  const subscription = {
    plan: obj.subscription?.plan || "free",
    status: obj.subscription?.status || "trial",
    billingCycle: obj.subscription?.billingCycle || null,
    startedAt: obj.subscription?.startedAt || null,
    expiresAt: obj.subscription?.expiresAt || null,
    amount: obj.subscription?.amount || 0,
    tier: obj.subscription?.tier || "",
    reference: obj.subscription?.reference || ""
  };

  return {
    ...obj,
    industryType,
    businessType,
    plan: subscription.plan,
    isPro: subscription.plan === "pro" && subscription.status === "active",
    subscription
  };
};

// 🔥 GET BUSINESS (HARDENED)
export const getBusiness = async (req, res) => {
  try {
    // 🚫 BLOCK INVALID USER STATE
    if (!req.user?.businessId) {
      return res.status(400).json({
        message: "No business linked to user"
      });
    }

    const business = await Business.findById(req.user.businessId).lean();

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    const industryType = business?.industryType || "retail";

    // ensure we can safely read business fields on older records
    const normalizedBusiness = {
      ...business,
      industryType,
      businessType: business?.businessType || "general_services",
      name: business?.name || "",
      products: business?.products || [],
      subscription: {
        ...(business?.subscription || {}),
        plan: business?.subscription?.plan || "free",
        status: business?.subscription?.status || "trial",
        billingCycle: business?.subscription?.billingCycle || null,
        startedAt: business?.subscription?.startedAt || null,
        expiresAt: business?.subscription?.expiresAt || null,
        amount: business?.subscription?.amount || 0,
        tier: business?.subscription?.tier || "",
        reference: business?.subscription?.reference || ""
      }
    };

    res.json(formatBusiness(normalizedBusiness));

  } catch (err) {
    console.error("❌ GET BUSINESS ERROR:", err);
    res.status(500).json({
      message: err.message
    });
  }
};

// 🔥 UPDATE BUSINESS SETTINGS (HARDENED)
export const updateBusiness = async (req, res) => {
  try {
    // 🚫 BLOCK INVALID USER STATE
    if (!req.user?.businessId) {
      return res.status(400).json({
        message: "No business linked to user"
      });
    }

    const business = await Business.findById(req.user.businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    const {
      name,
      address,
      phone,
      email,
      receiptFooter,
      receiptTheme,
      businessType,
      industryType,
      logo
    } = req.body;

    // 🔥 LOGO UPLOAD
    if (req.file) {
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(base64, {
        folder: "business_logos"
      });

      business.logo = result.secure_url;
    }

    // 🔥 REMOVE LOGO
    if (logo === "") {
      business.logo = "";
    }

    // 🔥 UPDATE FIELDS (SAFE MERGE)
    business.name = name ?? business.name;
    business.address = address ?? business.address;
    business.phone = phone ?? business.phone;
    business.email = email ?? business.email;
    business.receiptFooter = receiptFooter ?? business.receiptFooter;
    business.receiptTheme = receiptTheme ?? business.receiptTheme;
    business.businessType = businessType ?? business.businessType;
    business.industryType = industryType || business.industryType || "retail";

    await business.save();

    res.json(formatBusiness(business));

  } catch (err) {
    console.error("❌ UPDATE BUSINESS ERROR:", err);
    res.status(500).json({
      message: err.message
    });
  }
};