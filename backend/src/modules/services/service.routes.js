import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import checkPermission from "../../middlewares/permission.middleware.js";

import serviceController from "./service.controller.js";

const router = express.Router();

// ======================================
// 🔥 CREATE SERVICE
// ======================================

router.post(
  "/",
  protect,
  checkPermission("canManageProducts"),
  serviceController.createService
);

// ======================================
// 🔥 GET ALL SERVICES
// ======================================

router.get(
  "/",
  protect,
  checkPermission("canViewProducts"),
  serviceController.getServices
);

// ======================================
// 🔥 GET SINGLE SERVICE
// ======================================

router.get(
  "/:id",
  protect,
  checkPermission("canViewProducts"),
  serviceController.getServiceById
);

// ======================================
// 🔥 UPDATE SERVICE
// ======================================

router.put(
  "/:id",
  protect,
  checkPermission("canManageProducts"),
  serviceController.updateService
);

// ======================================
// 🔥 ACTIVATE / DEACTIVATE
// ======================================

router.patch(
  "/:id/toggle-status",
  protect,
  checkPermission("canManageProducts"),
  serviceController.toggleServiceStatus
);

// ======================================
// 🔥 DELETE SERVICE
// ======================================

router.delete(
  "/:id",
  protect,
  checkPermission("canManageProducts"),
  serviceController.deleteService
);

export default router;