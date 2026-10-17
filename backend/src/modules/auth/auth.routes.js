import express from "express";
import authController from "./auth.controller.js";
import protect from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/modes/bms", protect, authController.ensureBmsWorkspace);
router.post("/refresh", authController.refresh);
router.get("/me", protect, authController.getCurrentUser);
router.patch("/appearance", protect, authController.updateAppearance);
router.patch("/password", protect, authController.changePassword);

export default router;