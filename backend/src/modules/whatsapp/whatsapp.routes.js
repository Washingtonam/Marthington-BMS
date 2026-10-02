import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import whatsappController from "./whatsapp.controller.js";

const router = express.Router();

router.get("/health", whatsappController.healthCheck);
router.post("/webhook", whatsappController.handleIncomingWebhook);
router.post("/send-product-message", protect, whatsappController.sendProductAvailabilityMessage);

export default router;
