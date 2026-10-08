import express from "express";
import { getShopListings } from "./shop.controller.js";

const router = express.Router();

router.get("/", getShopListings);

export default router;
