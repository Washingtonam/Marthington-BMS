import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import reportsController from "./reports.controller.js";

const router = express.Router();

router.get(
  "/",
  protect,
  reportsController.getReports
);

export default router;