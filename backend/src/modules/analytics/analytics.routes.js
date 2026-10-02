import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import analyticsController from "./analytics.controller.js";

const router = express.Router();

router.get(
  "/",
  protect,
  analyticsController.getAnalytics
);

export default router;