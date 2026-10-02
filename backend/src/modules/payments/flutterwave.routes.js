import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import flutterwaveController from "./flutterwave.controller.js";

const router = express.Router();

router.post(
  "/initialize",
  protect,
  flutterwaveController.initializeFlutterwave
);

router.post(
  "/webhook",
  flutterwaveController.flutterwaveWebhook
);

export default router;
