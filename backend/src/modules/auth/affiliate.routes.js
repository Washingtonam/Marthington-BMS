import express from "express";
import affiliateController from "./affiliate.controller.js";

const router = express.Router();

router.post("/register", affiliateController.registerAffiliate);

export default router;
