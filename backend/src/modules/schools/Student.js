import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
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
    className: {
      type: String,
      required: true,
      trim: true
    },
    arm: {
      type: String,
      default: "",
      trim: true
    },
    parentContact: {
      type: String,
      default: "",
      trim: true
    },
    tuitionStanding: {
      type: String,
      enum: ["paid", "partial", "due"],
      default: "due"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Student", StudentSchema);
