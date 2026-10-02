import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import { getPricing, updatePricing } from "./billing.controller.js";
import flutterwaveController from "../payments/flutterwave.controller.js";

const router = express.Router();

router.get("/pricing", getPricing);
router.post("/initialize", protect, flutterwaveController.initializeFlutterwave);
router.put("/pricing", protect, (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
}, updatePricing);

export default router;
