import bcrypt from "bcryptjs";

import User from "../users/user.model.js";

import Business from "../businesses/business.model.js";

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

        role: {
          $ne: "super_admin"
        }
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
      email,
      password,
      role,
      permissions
    } = req.body;

    const existing =
      await User.findOne({
        email
      });

    if (existing) {
      return res.status(409).json({
        message:
          "Email already exists"
      });
    }

    const hashed =
      await bcrypt.hash(
        password,
        10
      );

    const user =
      await User.create({

        name,

        email,

        password: hashed,

        role:
          role || "staff",

        permissions:
          permissions || {},

        business:
          req.user.businessId
      });

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

    res.status(500).json({
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

    const {
      name,
      role,
      permissions,
      isActive
    } = req.body;

    if (name !== undefined) {
      user.name = name;
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (
      permissions !== undefined
    ) {
      user.permissions =
        permissions;
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

    res.status(500).json({
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

    await user.deleteOne();

    res.json({
      message:
        "Staff deleted"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

export default {

  getStaff,

  createStaff,

  updateStaff,

  deleteStaff
};