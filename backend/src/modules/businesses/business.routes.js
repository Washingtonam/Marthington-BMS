import express from "express";
import multer from "multer";
import protect from "../../middlewares/auth.middleware.js";
import {
  getBusiness,
  updateBusiness
} from "./business.controller.js";

const router = express.Router();

// 🔥 MULTER SETUP (STORE FILE IN MEMORY)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// EXISTING ROUTES (UNCHANGED)
router.get("/", protect, getBusiness);

// 🔥 UPDATED ROUTE (NOW ACCEPTS FILE)
router.put("/", protect, upload.single("logo"), updateBusiness);

export default router;