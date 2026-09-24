import express from "express";
import authController from "./auth.controller.js";
import protect from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", protect, authController.getCurrentUser);

export default router;