import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import { getUserGuide, saveUserGuide } from "./userGuide.controller.js";

const router = express.Router();

router.get("/", protect, getUserGuide);
router.put("/", protect, (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
}, saveUserGuide);

export default router;
