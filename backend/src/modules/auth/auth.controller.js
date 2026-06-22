import User from "../users/user.model.js";
import Business from "../businesses/business.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";

// 🔥 REGISTER (FULL BUSINESS ONBOARDING)
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      businessName,
      address,
      phone,
      industryType = "retail"
    } = req.body;

    // CHECK EXISTING USER
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE BUSINESS (🔥 NOW COMPLETE)
    const business = await Business.create({
      name: businessName,
      address,
      phone,
      industryType
    });

    // CREATE OWNER (🔥 FULL PERMISSIONS)
    const user = await User.create({
      name,
      email,
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
        canManageStaff: true,
        canManageSettings: true
      }
    });

    // LINK OWNER → BUSINESS
    business.owner = user._id;
    await business.save();

    const token = generateToken(user, business.industryType);

    res.json({
      token,
      user: {
        ...user.toObject(),
        industryType: business.industryType
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔐 LOGIN (🔥 WITH ACTIVE CHECK)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate(
      "business",
      "industryType"
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

    const industryType =
      user.business?.industryType || "retail";

    const token = generateToken(user, industryType);

    res.json({
      token,
      user: {
        ...user.toObject(),
        industryType
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  register,
  login
};