import crypto from "node:crypto";
import VideoExport from "./videoExport.model.js";

const safeManifest = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const saveVideoExport = async (req, res) => {
  if (!req.user.businessId) {
    return res.status(400).json({ message: "A business workspace is required." });
  }

  const manifest = safeManifest(req.body?.manifest);
  const requestedRunId = typeof req.body?.runId === "string" ? req.body.runId.trim() : "";
  const runId = requestedRunId || `video-${crypto.randomUUID()}`;
  const name = typeof req.body?.name === "string" && req.body.name.trim()
    ? req.body.name.trim().slice(0, 200)
    : manifest.name || "Untitled script video";

  const latest = await VideoExport.findOne({
    business: req.user.businessId,
    name,
  }).sort({ version: -1 }).select("version").lean();

  const version = Number(req.body?.version) > 0
    ? Number(req.body.version)
    : (latest?.version || 0) + 1;

  const exportRecord = await VideoExport.findOneAndUpdate(
    { business: req.user.businessId, runId },
    {
      $set: {
        business: req.user.businessId,
        createdBy: req.user.id,
        runId,
        name,
        version,
        manifestVersion: manifest.manifestVersion || "1.0",
        manifest,
        scriptText: typeof req.body?.scriptText === "string" ? req.body.scriptText : "",
        interpolatedScript: typeof req.body?.interpolatedScript === "string"
          ? req.body.interpolatedScript
          : "",
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  return res.status(201).json({
    export: {
      id: exportRecord._id.toString(),
      runId: exportRecord.runId,
      name: exportRecord.name,
      version: exportRecord.version,
      createdAt: exportRecord.createdAt,
    },
  });
};

export const listVideoExports = async (req, res) => {
  if (!req.user.businessId) {
    return res.status(400).json({ message: "A business workspace is required." });
  }
  const exportsList = await VideoExport.find({ business: req.user.businessId })
    .sort({ createdAt: -1 })
    .limit(100)
    .select("_id runId name version manifestVersion createdAt updatedAt")
    .lean();

  return res.json({
    exports: exportsList.map((item) => ({
      id: item._id.toString(),
      runId: item.runId,
      name: item.name,
      version: item.version,
      manifestVersion: item.manifestVersion,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  });
};

export const getVideoExport = async (req, res) => {
  if (!req.user.businessId) {
    return res.status(400).json({ message: "A business workspace is required." });
  }
  const exportRecord = await VideoExport.findOne({
    _id: req.params.id,
    business: req.user.businessId,
  }).lean();
  if (!exportRecord) {
    return res.status(404).json({ message: "Video export version not found." });
  }
  return res.json({ export: exportRecord });
};

export const downloadVideoExport = async (req, res) => {
  if (!req.user.businessId) {
    return res.status(400).json({ message: "A business workspace is required." });
  }
  const exportRecord = await VideoExport.findOne({
    _id: req.params.id,
    business: req.user.businessId,
  }).lean();
  if (!exportRecord) {
    return res.status(404).json({ message: "Video export version not found." });
  }

  const filename = `${String(exportRecord.name).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "video"}-v${exportRecord.version}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(JSON.stringify(exportRecord.manifest, null, 2));
};
