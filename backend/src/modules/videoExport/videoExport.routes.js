import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import {
  downloadVideoExport,
  getVideoExport,
  listVideoExports,
  saveVideoExport,
} from "./videoExport.controller.js";

const router = express.Router();

router.get("/", protect, listVideoExports);
router.post("/", protect, saveVideoExport);
router.get("/:id", protect, getVideoExport);
router.get("/:id/download", protect, downloadVideoExport);

export default router;
