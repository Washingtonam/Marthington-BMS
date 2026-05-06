import Business from "./business.model.js";
import cloudinary from "../../utils/cloudinary.js";

// 🔥 NORMALIZE BUSINESS RESPONSE (SINGLE SOURCE OF TRUTH)
const formatBusiness = (business) => {
  const obj = business.toObject();
  const subPlan = obj.subscription?.plan;

  return {
    ...obj,
    plan: subPlan || obj.plan || "free",
    isPro: subPlan === "pro",
    subscription: {
      ...obj.subscription,
      plan: subPlan || "free",
      status: obj.subscription?.status || "trial"
    }
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

    const business = await Business.findById(req.user.businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    res.json(formatBusiness(business));

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

    await business.save();

    res.json(formatBusiness(business));

  } catch (err) {
    console.error("❌ UPDATE BUSINESS ERROR:", err);
    res.status(500).json({
      message: err.message
    });
  }
};