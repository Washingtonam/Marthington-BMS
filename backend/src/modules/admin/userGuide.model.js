import mongoose from "mongoose";

const userGuideSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const UserGuide = mongoose.model("UserGuide", userGuideSchema);

export default UserGuide;
