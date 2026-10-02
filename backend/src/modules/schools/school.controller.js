import School from "./School.js";
import Student from "./Student.js";

const createSchool = async (req, res) => {
  try {
    const existing = await School.findOne({ businessId: req.user.businessId });

    if (existing) {
      return res.status(400).json({ message: "School profile already exists for this business." });
    }

    const school = await School.create({
      businessId: req.user.businessId,
      ...req.body
    });

    res.json(school);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSchool = async (req, res) => {
  try {
    const school = await School.findOne({ businessId: req.user.businessId });

    if (!school) {
      return res.status(404).json({ message: "School profile not found." });
    }

    res.json(school);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateSchool = async (req, res) => {
  try {
    const school = await School.findOneAndUpdate(
      { businessId: req.user.businessId },
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ message: "School profile not found." });
    }

    res.json(school);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createStudent = async (req, res) => {
  try {
    const student = await Student.create({
      businessId: req.user.businessId,
      ...req.body
    });

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const students = await Student.find({ businessId: req.user.businessId }).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      businessId: req.user.businessId
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  createSchool,
  getSchool,
  updateSchool,
  createStudent,
  getStudents,
  getStudentById
};
