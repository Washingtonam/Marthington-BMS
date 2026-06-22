import mongoose from "mongoose";

const SchoolSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true
    },
    academicTerm: {
      type: String,
      default: "First Term"
    },
    session: {
      type: String,
      default: "2026/2027"
    },
    totalClasses: [
      {
        className: {
          type: String,
          trim: true
        },
        arm: {
          type: String,
          trim: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model("School", SchoolSchema);
