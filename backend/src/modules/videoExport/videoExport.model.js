import mongoose from "mongoose";

const videoExportSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    runId: { type: String, required: true, unique: true, maxlength: 100 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    version: { type: Number, required: true, min: 1 },
    manifestVersion: { type: String, required: true, default: "1.0" },
    manifest: { type: mongoose.Schema.Types.Mixed, required: true },
    scriptText: { type: String, default: "" },
    interpolatedScript: { type: String, default: "" },
  },
  { timestamps: true }
);

videoExportSchema.index({ business: 1, createdAt: -1 });
videoExportSchema.index({ business: 1, name: 1, version: -1 });

export default mongoose.model("VideoExport", videoExportSchema);
