import Hospital from "./Hospital.js";
import Patient from "./Patient.js";

const createHospital = async (req, res) => {
  try {
    const existing = await Hospital.findOne({ businessId: req.user.businessId });

    if (existing) {
      return res.status(400).json({ message: "Hospital profile already exists for this business." });
    }

    const hospital = await Hospital.create({
      businessId: req.user.businessId,
      ...req.body
    });

    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ businessId: req.user.businessId });

    if (!hospital) {
      return res.status(404).json({ message: "Hospital profile not found." });
    }

    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findOneAndUpdate(
      { businessId: req.user.businessId },
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!hospital) {
      return res.status(404).json({ message: "Hospital profile not found." });
    }

    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createPatient = async (req, res) => {
  try {
    const patient = await Patient.create({
      businessId: req.user.businessId,
      ...req.body
    });

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find({ businessId: req.user.businessId }).sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      businessId: req.user.businessId
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  createHospital,
  getHospital,
  updateHospital,
  createPatient,
  getPatients,
  getPatientById
};
