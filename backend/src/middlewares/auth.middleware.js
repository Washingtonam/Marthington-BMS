import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";

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
    const user = await User.findById(decoded.id);

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
    let businessId =
      user.business?.toString() ||
      decoded.businessId?.toString() ||
      null;

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

    // 🔥 NORMALIZED USER
    req.user = {
      id: user._id.toString(),
      email: user.email || "",
      name: user.name || "",
      role: user.role,
      businessId,
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