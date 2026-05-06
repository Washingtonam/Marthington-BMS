import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import {
  createStaff,
  getStaff,
  updateStaff,
  toggleStaffStatus
} from "./users.controller.js";

const router = express.Router();

router.get("/", protect, getStaff);
router.post("/staff", protect, createStaff);
router.put("/:id", protect, updateStaff);
router.patch("/:id/status", protect, toggleStaffStatus);

export default router;