import bcrypt from "bcryptjs";

import User from "../users/user.model.js";
import Branch from "../branches/branch.model.js";
import Business from "../businesses/business.model.js";

const STAFF_ROLES = ["staff", "cashier", "manager"];

const isPrivileged = (user = {}) => ["owner", "super_admin"].includes(user.role);

const getPermissionGrantViolations = (actorPermissions = {}, candidatePermissions = {}) => (
  Object.keys(candidatePermissions).filter((permission) => (
    candidatePermissions[permission] === true && actorPermissions[permission] !== true
  ))
);

const hasCrossBranchManagement = (user = {}) => (
  isPrivileged(user) || user.permissions?.canManageAllBranchInventory === true
);

const validateStaffRole = (role) => STAFF_ROLES.includes(role);

const rejectOverGrant = (req, permissions, res) => {
  const violations = getPermissionGrantViolations(req.user?.permissions, permissions);

  if (violations.length > 0) {
    res.status(403).json({
      message: `You cannot grant permissions you do not already hold: ${violations.join(", ")}`
    });
    return true;
  }

  return false;
};

const validateBranchAssignment = async (req, branch) => {
  const normalizedBranch = normalizeBranchAssignment(branch);

  if (!normalizedBranch) return normalizedBranch;

  const branchRecord = await Branch.findOne({
    _id: normalizedBranch,
    business: req.user.businessId
  });

  if (!branchRecord) {
    const error = new Error("Invalid branch assignment");
    error.statusCode = 400;
    throw error;
  }

  if (!hasCrossBranchManagement(req.user) && req.user.branchId && String(req.user.branchId) !== String(normalizedBranch)) {
    const error = new Error("You can only assign staff to your own branch");
    error.statusCode = 403;
    throw error;
  }

  return normalizedBranch;
};

export const normalizeBranchAssignment = (branch) => {
  if (branch === undefined || branch === null) {
    return null;
  }

  if (typeof branch === "string") {
    const trimmed = branch.trim();
    return trimmed ? trimmed : null;
  }

  return branch;
};

// =====================================
// GET STAFF
// =====================================

const getStaff = async (
  req,
  res
) => {
  try {

    const users =
      await User.find({
        business:
          req.user.businessId,

        role: { $in: STAFF_ROLES }
      }).select("-password");

    res.json(users);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

// =====================================
// CREATE STAFF
// =====================================

const createStaff = async (
  req,
  res
) => {
  try {

    const business =
      await Business.findById(
        req.user.businessId
      );

    if (!business) {
      return res.status(404).json({
        message:
          "Business not found"
      });
    }

    const limits =
      business.getLimits();

    const staffCount =
      await User.countDocuments({
        business:
          req.user.businessId,

        role: {
          $ne: "owner"
        }
      });

    if (
      staffCount >= limits.staff
    ) {
      return res.status(403).json({
        message:
          "Staff limit reached"
      });
    }

    const {
      name,
      email: rawEmail,
      password,
      role,
      permissions,
      branch
    } = req.body;
    const email = (rawEmail || "").toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (!validateStaffRole(role || "staff")) {
      return res.status(400).json({ message: "Only staff, cashier, or manager accounts can be created here" });
    }

    if (permissions && rejectOverGrant(req, permissions, res)) return;

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        message:
          "Email already exists"
      });
    }

    const normalizedBranch = await validateBranchAssignment(req, branch);

    const hashed =
      await bcrypt.hash(
        password,
        10
      );

    const userData = {
      name,
      email,
      password: hashed,
      role: role || "staff",
      permissions: permissions || {},
      business: req.user.businessId,
      branch: normalizedBranch,
      isActive: true
    };

    const user = await User.create(userData);

    res.json({
      message: "Staff created",
      user
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: err.message
      });
    }

    res.status(err.statusCode || 500).json({
      message: err.message
    });

  }
};

// =====================================
// UPDATE STAFF
// =====================================

const updateStaff = async (
  req,
  res
) => {
  try {

    const user =
      await User.findById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found"
      });
    }

    if (
      user.business?.toString() !==
      req.user.businessId
    ) {
      return res.status(403).json({
        message:
          "Unauthorized"
      });
    }

    if (!STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Only staff, cashier, or manager accounts can be managed here" });
    }

    const {
      name,
      role,
      permissions,
      isActive,
      branch
    } = req.body;

    if (role !== undefined && !validateStaffRole(role)) {
      return res.status(400).json({ message: "Only staff, cashier, or manager roles are allowed" });
    }

    if (permissions !== undefined && rejectOverGrant(req, permissions, res)) return;

    if (name !== undefined) {
      user.name = name;
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (
      permissions !== undefined
    ) {
      user.permissions = {
        ...user.permissions,
        ...permissions
      };
    }

    const normalizedBranch = await validateBranchAssignment(req, branch);

    if (branch !== undefined) {
      user.branch = normalizedBranch;
    }

    if (
      isActive !== undefined
    ) {
      user.isActive =
        isActive;
    }

    await user.save();

    res.json({
      message:
        "Staff updated",

      user
    });

  } catch (err) {

    res.status(err.statusCode || 500).json({
      message: err.message
    });

  }
};

// =====================================
// DELETE STAFF
// =====================================

const deleteStaff = async (
  req,
  res
) => {
  try {

    const user =
      await User.findById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found"
      });
    }

    if (
      user.business?.toString() !==
      req.user.businessId
    ) {
      return res.status(403).json({
        message:
          "Unauthorized"
      });
    }

    if (!STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Owner and administrator accounts cannot be deleted here" });
    }

    await user.deleteOne();

    res.json({
      message:
        "Staff deleted"
    });

  } catch (err) {

    res.status(err.statusCode || 500).json({
      message: err.message
    });

  }
};

const toggleStaffStatus = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      business: req.user.businessId,
      role: { $in: STAFF_ROLES }
    });

    if (!user) {
      return res.status(404).json({ message: "Staff not found" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `Staff ${user.isActive ? "enabled" : "disabled"}`,
      staff: user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {

  getStaff,

  createStaff,

  updateStaff,

  deleteStaff,

  toggleStaffStatus,

  normalizeBranchAssignment
};