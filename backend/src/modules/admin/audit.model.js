import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    operatorEmail: { type: String, required: false },
    action: { type: String, required: true }, // delete | archive | unarchive | suspend | unsuspend
    targetEntity: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    reason: { type: String, required: true },
    details: { type: Object, default: {} }
  },
  { timestamps: true }
);

const Audit = mongoose.model("Audit", auditSchema);

export default Audit;
