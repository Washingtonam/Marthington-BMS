import mongoose from "mongoose";

const HospitalSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true
    },
    totalBeds: {
      type: Number,
      default: 0
    },
    departments: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Hospital", HospitalSchema);
