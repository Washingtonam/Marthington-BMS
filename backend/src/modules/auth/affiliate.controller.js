import User from "../users/user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";

const registerAffiliate = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      bankName = "",
      accountNumber = "",
      accountName = ""
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const affiliateCode = `${name.replace(/\s+/g, "").slice(0, 5).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "affiliate",
      affiliateCode,
      walletBalance: 0,
      totalEarned: 0,
      paymentDetails: {
        bankName,
        accountNumber,
        accountName
      }
    });

    const token = generateToken(user, "retail", false);

    res.json({
      token,
      user: {
        ...user.toObject(),
        industryType: "retail",
        isPro: false
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  registerAffiliate
};
