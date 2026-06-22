import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    medicalRecordNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true
    },
    diagnosis: {
      type: String,
      default: "",
      trim: true
    },
    admissionStatus: {
      type: String,
      enum: ["admitted", "discharged", "outpatient"],
      default: "outpatient"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Patient", PatientSchema);
