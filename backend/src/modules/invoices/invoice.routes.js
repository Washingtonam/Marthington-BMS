import express from "express";

import protect from "../../middlewares/auth.middleware.js";
import checkSubscription from "../../middlewares/subscription.middleware.js";

import invoiceController from "./invoice.controller.js";

const router =
  express.Router();

router.post(
  "/",
  protect,
  checkSubscription,
  invoiceController.createInvoice
);

router.put(
  "/:invoiceId/payment",
  protect,
  invoiceController.updateInvoicePayment
);

router.put(
  "/:id",
  protect,
  invoiceController.updateInvoice
);

router.delete(
  "/:id",
  protect,
  invoiceController.deleteInvoice
);

router.put(
  "/:invoiceId/return-item",
  protect,
  invoiceController.returnInvoiceItem
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