import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import invoiceController from "./invoice.controller.js";

const router =
  express.Router();

router.post(
  "/",
  protect,
  invoiceController.createInvoice
);

router.get(
  "/",
  protect,
  invoiceController.getInvoices
);

router.get(
  "/:id",
  protect,
  invoiceController.getInvoiceById
);

export default router;