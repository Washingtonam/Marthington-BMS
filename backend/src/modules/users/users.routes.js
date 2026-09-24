import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import checkPermission from "../../middlewares/permission.middleware.js";
import staffController from "../staff/staff.controller.js";

const router = express.Router();

router.get("/", protect, checkPermission("canManageStaff"), staffController.getStaff);
router.post("/staff", protect, checkPermission("canInviteStaff"), staffController.createStaff);
router.put("/:id", protect, checkPermission("canEditStaffPermissions"), staffController.updateStaff);
router.patch("/:id/status", protect, checkPermission("canDeactivateStaff"), staffController.toggleStaffStatus);

export default router;