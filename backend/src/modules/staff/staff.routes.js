import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import staffController from "./staff.controller.js";

const router = express.Router();

router.get(
  "/",
  protect,
  staffController.getStaff
);

router.post(
  "/",
  protect,
  staffController.createStaff
);

router.put(
  "/:id",
  protect,
  staffController.updateStaff
);

router.delete(
  "/:id",
  protect,
  staffController.deleteStaff
);

export default router;