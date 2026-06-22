import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import schoolController from "./school.controller.js";

const router = express.Router();

router.post("/", protect, schoolController.createSchool);
router.get("/", protect, schoolController.getSchool);
router.put("/", protect, schoolController.updateSchool);
router.post("/students", protect, schoolController.createStudent);
router.get("/students", protect, schoolController.getStudents);
router.get("/students/:id", protect, schoolController.getStudentById);

export default router;
