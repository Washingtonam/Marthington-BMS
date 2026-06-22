import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import hospitalController from "./hospital.controller.js";

const router = express.Router();

router.post("/", protect, hospitalController.createHospital);
router.get("/", protect, hospitalController.getHospital);
router.put("/", protect, hospitalController.updateHospital);
router.post("/patients", protect, hospitalController.createPatient);
router.get("/patients", protect, hospitalController.getPatients);
router.get("/patients/:id", protect, hospitalController.getPatientById);

export default router;
