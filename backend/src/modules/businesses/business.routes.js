import express from "express";
import multer from "multer";

import protect from "../../middlewares/auth.middleware.js";
import checkPermission from "../../middlewares/permission.middleware.js";

import {
  getBusiness,
  updateBusiness
} from "./business.controller.js";

const router = express.Router();

// 🔥 MULTER
const storage = multer.memoryStorage();

const upload = multer({ storage });

// =====================================
// GET BUSINESS SETTINGS
// =====================================

router.get(
  "/",
  protect,
  checkPermission("canManageSettings"),
  getBusiness
);

// =====================================
// UPDATE BUSINESS SETTINGS
// =====================================

router.put(
  "/",
  protect,
  checkPermission("canManageSettings"),
  upload.single("logo"),
  updateBusiness
);

export default router;