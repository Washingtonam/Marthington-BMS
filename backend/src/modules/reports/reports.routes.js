import express from "express";
import checkPermission from "../../middlewares/permission.middleware.js";
import protect from "../../middlewares/auth.middleware.js";

import reportsController from "./reports.controller.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkPermission("canViewReports"),
  reportsController.getReports
);

export default router;