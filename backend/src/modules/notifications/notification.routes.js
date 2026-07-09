import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import notificationController from "./notification.controller.js";

const router = express.Router();

// 🔒 Protected routes - partner can access their own notifications
router.get(
  "/",
  protect,
  notificationController.getNotifications
);

router.put(
  "/:notificationId/read",
  protect,
  notificationController.markAsRead
);

router.put(
  "/mark-all-as-read",
  protect,
  notificationController.markAllAsRead
);

router.delete(
  "/:notificationId",
  protect,
  notificationController.deleteNotification
);

export default router;
