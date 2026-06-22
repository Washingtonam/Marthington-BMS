import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";
import Business from "../modules/businesses/business.model.js";

const protect = async (req, res, next) => {
  try {
    // 🔐 TOKEN
    const authHeader = req.headers.authorization;

    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!token) {
      return res.status(401).json({
        message: "No token provided"
      });
    }

    // 🔓 VERIFY
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 🔥 FETCH USER
    const user = await User.findById(decoded.id).populate(
      "business"
    );

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    // 🚫 DISABLED
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account disabled"
      });
    }

    // 🔥 BUSINESS ID FALLBACK SYSTEM
    let businessId = null;

    if (user.business) {
      if (typeof user.business === "string") {
        businessId = user.business;
      } else if (user.business._id) {
        businessId = user.business._id.toString();
      } else {
        businessId = user.business.toString();
      }
    }

    if (!businessId && decoded.businessId) {
      businessId =
        decoded.businessId._id?.toString?.() ||
        decoded.businessId.toString();
    }

    // 🔥 SUPER ADMIN IMPERSONATION
    const impersonatedBusiness =
      req.headers["x-business-id"];

    if (
      impersonatedBusiness &&
      user.role === "super_admin"
    ) {
      businessId = impersonatedBusiness;
    }

    // 🚫 BLOCK NORMAL USERS WITH NO BUSINESS
    if (
      !businessId &&
      user.role !== "super_admin"
    ) {
      return res.status(400).json({
        message: "No business linked to user"
      });
    }

    // 🔥 REAL-TIME BUSINESS STATUS
    const activeBusiness = businessId
      ? await Business.findById(businessId).lean()
      : null;

    const isProFromBusiness =
      activeBusiness?.isPro ||
      activeBusiness?.subscription?.plan === "pro" &&
        activeBusiness?.subscription?.status === "active";

    req.user = {
      id: user._id.toString(),
      email: user.email || "",
      name: user.name || "",
      role: user.role,
      businessId,
      industryType:
        activeBusiness?.industryType ||
        user.business?.industryType ||
        decoded.industryType ||
        "retail",
      isPro: isProFromBusiness || false,
      permissions: user.permissions || {},
      isActive: user.isActive
    };

    next();

  } catch (err) {
    console.error("AUTH ERROR:", err);

    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

export default protect;