import jwt from "jsonwebtoken";
import ShopCustomer from "./shopCustomer.model.js";

const protectShopCustomer = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Please sign in to your shop account." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "shop_customer") {
      return res.status(401).json({ message: "Invalid shop customer session." });
    }

    const customer = await ShopCustomer.findById(decoded.id);
    if (!customer || !customer.isActive) {
      return res.status(401).json({ message: "Shop customer account not found or disabled." });
    }

    req.shopCustomer = customer;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Your shop session has expired. Please sign in again." });
    }
    console.error("SHOP CUSTOMER AUTH ERROR:", error);
    return res.status(500).json({ message: "Could not verify shop account." });
  }
};

export default protectShopCustomer;
