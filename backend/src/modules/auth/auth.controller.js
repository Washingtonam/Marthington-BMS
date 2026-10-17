import User from "../users/user.model.js";
import Business from "../businesses/business.model.js";
import SystemSettings from "../admin/systemSettings.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";
import jwt from "jsonwebtoken";
import { getBusinessPlanAccess } from "../subscriptions/planAccess.js";
import { validateAndNormalizeLocation } from "../../utils/locationData.js";
import { sendPasswordResetEmail } from "../../utils/emailService.js";
import { createPasswordResetToken, hashPasswordResetToken } from "./passwordResetToken.js";

const forgotPassword = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  try {
    const user = await User.findOne({ email });
    if (user) {
      const resetToken = createPasswordResetToken();
      user.passwordResetToken = resetToken.hashedToken;
      user.passwordResetExpires = resetToken.expiresAt;
      await user.save();

      const frontendUrl = String(
        process.env.FRONTEND_URL || process.env.APP_URL || "https://bms.marthington.com.ng"
      ).replace(/\/$/, "");
      try {
        await sendPasswordResetEmail({
          email: user.email,
          resetUrl: `${frontendUrl}/#/reset-password?token=${encodeURIComponent(resetToken.token)}`
        });
      } catch (emailError) {
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();
        console.error("PASSWORD RESET EMAIL ERROR:", emailError);
        return res.status(503).json({
          message: "Could not send the password reset email. Please try again later."
        });
      }
    }

    return res.json({
      message: "If an account exists for that email, a password reset link will be sent."
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Could not process the password reset request." });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ message: "This password reset link is invalid or has expired." });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    const hashedToken = hashPasswordResetToken(token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select("+passwordResetToken +passwordResetExpires");
    if (!user) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null;
    await user.save();

    return res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Could not reset the password." });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -refreshToken")
      .populate("business")
      .populate("branch", "name");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const business = user.business || {};
    const isPro = business.isPro === true || (
      business.subscription?.plan === "pro" &&
      business.subscription?.status === "active"
    );
    const planAccess = business?._id ? await getBusinessPlanAccess(business) : null;
    const businessData = business?.toObject ? business.toObject() : business;
    const formattedBusiness = planAccess
      ? {
          ...businessData,
          planLimits: {
            products: planAccess.products,
            staff: planAccess.staff,
            posProducts: planAccess.posProducts
          },
          planFeatures: planAccess.features
        }
      : businessData;

    return res.json({
      user: {
        ...user.toObject(),
        industryType: business.industryType || "retail",
        isPro
      },
      business: formattedBusiness
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateAppearance = async (req, res) => {
  const accentColor = String(req.body?.accentColor || "");
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    return res.status(400).json({ message: "Accent color must be a six-digit hex color." });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { "appearance.accentColor": accentColor.toLowerCase() } },
      { new: true, runValidators: true }
    ).select("appearance");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ appearance: user.appearance });
  } catch (error) {
    console.error("UPDATE USER APPEARANCE ERROR:", error);
    return res.status(500).json({ message: "Could not save appearance settings." });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ message: "Enter your current and new passwords." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters." });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentPasswordMatches) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Could not update password." });
  }
};

// 🔥 REGISTER (FULL BUSINESS ONBOARDING)
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      businessName,
      address,
      addressCountryCode,
      addressState,
      addressLocalGovernment,
      addressCity,
      phone,
      industryType = "retail",
      referralCode,
      agentCode,
      referredBy
    } = req.body;

    const location = validateAndNormalizeLocation({
      countryCode: addressCountryCode,
      state: addressState,
      localGovernment: addressLocalGovernment
    });
    if (location.error) return res.status(400).json({ message: location.error });
    if (!String(address || "").trim() || !String(addressCity || "").trim()) {
      return res.status(400).json({ message: "Enter a street address and city or town." });
    }

    const referralValue = [referralCode, agentCode, referredBy]
      .find((value) => typeof value === "string" && value.trim());
    const normalizedReferralCode = referralValue ? referralValue.trim().toUpperCase() : null;
    if (normalizedReferralCode) {
      const affiliate = await User.findOne({
        affiliateCode: normalizedReferralCode,
        isActive: true
      }).select("_id");
      if (!affiliate) {
        return res.status(400).json({ message: "Agent / referral code is invalid or inactive." });
      }
    }

    // CHECK EXISTING USER
      const existingUser = await User.findOne({ email: (email || "").toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE BUSINESS (🔥 NOW COMPLETE)
    const business = await Business.create({
      name: businessName,
      address: [
        String(address).trim(),
        String(addressCity).trim(),
        location.localGovernment,
        location.state,
        location.country
      ].filter(Boolean).join(", "),
      addressCountry: location.country,
      addressCountryCode: location.countryCode,
      addressState: location.state,
      addressLocalGovernment: location.localGovernment,
      addressCity: String(addressCity).trim(),
      phone,
      industryType,
      referredBy: normalizedReferralCode
    });

    // CREATE OWNER (🔥 FULL PERMISSIONS)
      const user = await User.create({
        name,
        email: (email || "").toLowerCase().trim(),
      password: hashedPassword,
      role: "owner",
      business: business._id,

      permissions: {
        canViewDashboard: true,
        canManageProducts: true,
        canViewProducts: true,
        canMakeSale: true,
        canViewSales: true,
        canViewReports: true,
        canOverridePrice: true,
        canViewBranches: true,
        canManageBranches: true,
        canViewBranchInventory: true,
        canViewAllBranchInventory: true,
        canManageBranchInventory: true,
        canManageAllBranchInventory: true,
        canViewCustomers: true,
        canManageCustomers: true,
        canViewInvoices: true,
        canManageInvoices: true,
        canViewExpenses: true,
        canManageExpenses: true,
        canViewPayments: true,
        canManagePayments: true,
        canAccessPOS: true,
        canApplyDiscounts: true,
        canProcessReturns: true,
        canViewSalesReports: true,
        canViewFinancialReports: true,
        canViewStaffReports: true,
        canInviteStaff: true,
        canEditStaffPermissions: true,
        canDeactivateStaff: true,
        canManageStaff: true,
        canManageSettings: true,
        canManageBilling: true,
        canManageBusinessProfile: true,
        canManageIntegrations: true
      }
    });

    // LINK OWNER → BUSINESS
    business.owner = user._id;
    await business.save();

    const token = generateToken(
      user,
      business.industryType,
      false
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      token,
      refreshToken,
      user: {
        ...user.toObject(),
        industryType: business.industryType,
        isPro: false
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const ensureBmsWorkspace = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken").populate("business");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.business) {
      const business = user.business;
      const token = generateToken(user, business.industryType || "retail", false);
      const publicUser = user.toObject();
      return res.json({
        token,
        user: {
          ...publicUser,
          industryType: business.industryType || "retail",
          isPro: business.isPro === true
        },
        business
      });
    }

    if (user.role !== "affiliate") {
      return res.status(400).json({ message: "This account does not have a BMS workspace." });
    }

    const business = await Business.create({
      name: `${user.name}'s Business`,
      email: user.email,
      phone: user.phone || user.phoneNumber || "",
      industryType: "retail",
      owner: user._id,
      subscription: {
        plan: "free",
        status: "active",
        billingCycle: null,
        startedAt: new Date(),
        expiresAt: null,
        amount: 0,
        currency: null
      }
    });

    user.role = "owner";
    user.business = business._id;
    await user.save();

    const token = generateToken(user, business.industryType, false);
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    user.refreshToken = refreshToken;
    await user.save();

    const publicUser = user.toObject();
    delete publicUser.password;
    delete publicUser.refreshToken;
    return res.status(201).json({
      token,
      refreshToken,
      user: {
        ...publicUser,
        industryType: business.industryType,
        isPro: false
      },
      business
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// 🔐 LOGIN (🔥 WITH ACTIVE CHECK)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

      const user = await User.findOne({ email: (email || "").toLowerCase().trim() }).populate(
      "business"
    );

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // 🔥 CHECK IF DISABLED
    if (!user.isActive) {
      return res.status(403).json({ message: "Account disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const business = user.business || {};

    // Block login if business suspended, archived or deleted
    if (business.status === "suspended" || business.status === "deleted" || business.status === "archived") {
      const settings = await SystemSettings.findOne().lean();
      return res.status(403).json({
        message: business.status === "deleted" ? "Organization removed - contact admin" : (business.status === "suspended" ? "Organization suspended - contact admin" : "Organization archived - contact admin"),
        adminContact: settings?.adminContact || { name: "Support", email: "support@marthington.com", phone: "" }
      });
    }

    const industryType =
      business.industryType || "retail";

    const isPro =
      business.isPro ||
      (business.subscription?.plan === "pro" &&
        business.subscription?.status === "active") ||
      false;

    const token = generateToken(user, industryType, isPro);

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      token,
      refreshToken,
      user: {
        ...user.toObject(),
        industryType,
        isPro
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔁 REFRESH ACCESS TOKEN
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "No refresh token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id).populate("business");
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const business = user.business || {};

    // Block refresh if business suspended, archived or deleted
    if (business.status === "suspended" || business.status === "deleted" || business.status === "archived") {
      const settings = await SystemSettings.findOne().lean();
      return res.status(403).json({
        message: business.status === "deleted" ? "Organization removed - contact admin" : (business.status === "suspended" ? "Organization suspended - contact admin" : "Organization archived - contact admin"),
        adminContact: settings?.adminContact || { name: "Support", email: "support@marthington.com", phone: "" }
      });
    }

    const industryType = business.industryType || "retail";

    const isPro =
      business.isPro ||
      (business.subscription?.plan === "pro" &&
        business.subscription?.status === "active") ||
      false;

    const token = generateToken(user, industryType, isPro);

    const newRefresh = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    user.refreshToken = newRefresh;
    await user.save();

    res.json({
      token,
      refreshToken: newRefresh,
      user: {
        ...user.toObject(),
        industryType,
        isPro
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  forgotPassword,
  resetPassword,
  register,
  login,
  ensureBmsWorkspace,
  refresh,
  getCurrentUser,
  updateAppearance,
  changePassword
};