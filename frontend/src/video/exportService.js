import JSZip from "jszip";
import { replaceBrandName, applyBrandingToValue } from "../utils/brandingTemplate.js";
import { synchronizeNarrationSegments } from "./narrationSync.js";

export const VIDEO_EXPORT_MANIFEST_VERSION = "1.0";
export const VIDEO_EXPORT_STORAGE_KEY = "marthington_video_export_versions";
export const VIDEO_EXPORT_MAX_LOCAL_VERSIONS = 50;

const nowIso = () => new Date().toISOString();

const createRunId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `video-${crypto.randomUUID()}`;
  }
  return `video-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const cleanObject = (value, fallback = {}) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : fallback;

const normalizeVersion = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
};

export const readLocalVideoExports = () => {
  try {
    return normalizeVersion(JSON.parse(localStorage.getItem(VIDEO_EXPORT_STORAGE_KEY)));
  } catch {
    return [];
  }
};

export const writeLocalVideoExport = (packageRecord) => {
  const previous = readLocalVideoExports();
  const next = [packageRecord, ...previous.filter((item) => item.runId !== packageRecord.runId)]
    .slice(0, VIDEO_EXPORT_MAX_LOCAL_VERSIONS);
  localStorage.setItem(VIDEO_EXPORT_STORAGE_KEY, JSON.stringify(next));
  return packageRecord;
};

export const getLocalVideoExport = (runId) =>
  readLocalVideoExports().find((item) => item.runId === runId) ?? null;

export const buildVideoExportPackage = ({
  name = "Untitled script video",
  videoConfig = {},
  script = "",
  narrationScript = "",
  sceneTimeline = [],
  brandingProfile = {},
  substitutionLog = [],
  metadata = {},
  artifacts = {},
  account,
  runId = createRunId(),
  version,
  createdAt = nowIso(),
} = {}) => {
  const video = cleanObject(videoConfig.video ?? videoConfig, {});
  const resolvedAccount = cleanObject(account ?? videoConfig.account, {
    type: "demo",
    isDemo: true,
    showDemoLabel: false,
    showDemoWatermark: false,
  });
  const branding = cleanObject(brandingProfile, {});
  const normalizedBranding = {
    businessName: String(branding.businessName ?? branding.name ?? "").trim(),
    phone: String(branding.phone ?? "").trim(),
    email: String(branding.email ?? "").trim(),
    address: String(branding.address ?? "").trim(),
    logoUrl: String(branding.logoUrl ?? branding.logo ?? "").trim(),
    accentTheme: String(branding.accentTheme ?? branding.primaryColor ?? ""),
  };

  const sourceScript = String(script ?? narrationScript ?? "");
  const interpolatedScript = replaceBrandName(sourceScript, normalizedBranding);
  const interpolationLog = applyBrandingToValue(normalizationSubstitutionLog(substitutionLog), normalizedBranding);

  const timelineInput = Array.isArray(sceneTimeline)
    ? sceneTimeline.map((item) => ({
        sceneKey: item.sceneKey ?? item.scene ?? item.key,
        narration: item.narration ?? item.text ?? item.narrationText ?? "",
        route: item.route,
        targetComponent: item.targetComponent,
        demoState: item.demoState ?? {},
        metadata: item.metadata ?? {},
      }))
    : [];
  const sceneTimelineSynced = synchronizeNarrationSegments(timelineInput, {
    wordsPerMinute: metadata.wordsPerMinute ?? 150,
  });

  const previous = readLocalVideoExports();
  const matchingVersions = previous.filter((item) => item.name === name);
  const resolvedVersion = Number.isInteger(version) && version > 0
    ? version
    : matchingVersions.reduce((maximum, item) => Math.max(maximum, Number(item.version) || 0), 0) + 1;

  const width = Number.isInteger(video.width) ? video.width : 1920;
  const height = Number.isInteger(video.height) ? video.height : 1080;
  const aspectRatio = String(video.aspectRatio || `${Math.round(width / gcd(width, height))}:${Math.round(height / gcd(width, height))}`);
  const targetResolution = String(video.targetResolution || `${width}x${height}`);

  const manifest = {
    manifestVersion: VIDEO_EXPORT_MANIFEST_VERSION,
    packageType: "marthington-script-to-video",
    runId,
    name,
    version: resolvedVersion,
    createdAt,
    video: {
      width,
      height,
      aspectRatio,
      targetResolution,
      targetOutputResolutions: Array.isArray(video.targetOutputResolutions)
        ? video.targetOutputResolutions
        : [targetResolution],
    },
    account: {
      type: resolvedAccount.type === "live" ? "live" : "demo",
      isDemo: resolvedAccount.type !== "live",
      showDemoLabel: false,
      showDemoWatermark: false,
    },
    branding: normalizedBranding,
    script: {
      source: sourceScript,
      interpolated: interpolatedScript,
      encoding: "utf-8",
    },
    substitutions: {
      replacements: interpolationLog,
      activeBusinessName: normalizedBranding.businessName,
      replacementCount: interpolationLog.length,
    },
    scenes: sceneTimelineSynced,
    metadata: cleanObject(metadata, {}),
    artifacts: cleanObject(artifacts, {}),
  };

  return {
    runId,
    name,
    version: resolvedVersion,
    createdAt,
    manifest,
  };
};

const normalizationSubstitutionLog = (substitutionLog) => {
  if (!Array.isArray(substitutionLog)) return [];
  return substitutionLog.filter((entry) => entry && typeof entry === "object");
};

const gcd = (left, right) => {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
};

export const saveLocalVideoExport = (packageRecord) => {
  return writeLocalVideoExport(packageRecord);
};

export const reloadVideoExportPackage = (runIdOrRecord) => {
  if (typeof runIdOrRecord === "object") return runIdOrRecord;
  return getLocalVideoExport(runIdOrRecord);
};

export const downloadJson = (value, filename) => {
  const blob = new Blob([typeof value === "string" ? value : JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadVideoExportPackage = async (packageRecordOrOptions, options = {}) => {
  const packageRecord = packageRecordOrOptions?.manifest
    ? packageRecordOrOptions
    : buildVideoExportPackage(packageRecordOrOptions);
  saveLocalVideoExport(packageRecord);

  const zip = new JSZip();
  const manifest = packageRecord.manifest;
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("script/narration.txt", manifest.script.interpolated);
  zip.file("config/video-config.json", JSON.stringify({
    video: manifest.video,
    account: manifest.account,
  }, null, 2));
  zip.file("branding/branding.json", JSON.stringify(manifest.branding, null, 2));
  zip.file("scenes/timeline.json", JSON.stringify(manifest.scenes, null, 2));
  zip.file("metadata/substitutions.json", JSON.stringify(manifest.substitutions, null, 2));
  zip.file("metadata/export.json", JSON.stringify({
    manifestVersion: manifest.manifestVersion,
    runId: manifest.runId,
    name: manifest.name,
    version: manifest.version,
    createdAt: manifest.createdAt,
  }, null, 2));

  const artifactEntries = Object.entries(manifest.artifacts ?? {});
  for (const [artifactName, artifactValue] of artifactEntries) {
    const safeName = String(artifactName)
      .split("/")
      .filter((segment) => segment && segment !== "." && segment !== "..")
      .map((segment) => segment.replace(/[^a-z0-9._-]/gi, "-"))
      .join("/");
    if (typeof artifactValue === "string") {
      zip.file(`assets/${safeName}`, artifactValue);
    } else {
      zip.file(`assets/${safeName}.json`, JSON.stringify(artifactValue, null, 2));
    }
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = manifest.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "video";
  link.href = url;
  link.download = `${safeName}-v${manifest.version}-${manifest.runId.slice(0, 12)}.zip`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  options.onDownloaded?.(packageRecord);
  return packageRecord;
};
