import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import customerController from "./customer.controller.js";

const router =
  express.Router();

router.post(
  "/",
  protect,
  customerController.createCustomer
);

router.get(
  "/",
  protect,
  customerController.getCustomers
);

router.get(
  "/:id",
  protect,
  customerController.getCustomerById
);

export default router;