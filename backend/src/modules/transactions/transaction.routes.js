import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import transactionController from "./transaction.controller.js";

const router = express.Router();

const ownerOnly = (req, res, next) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

router.get(
  "/",
  protect,
  transactionController.getTransactions
);

router.get(
  "/revenue-stats",
  protect,
  transactionController.getRevenueStats
);

router.get(
  "/profit-reports",
  protect,
  transactionController.getProfitReports
);

router.get(
  "/deleted-records",
  protect,
  ownerOnly,
  transactionController.getDeletedRecords
);

router.delete(
  "/:id",
  protect,
  ownerOnly,
  transactionController.deleteTransaction
);

export default router;
