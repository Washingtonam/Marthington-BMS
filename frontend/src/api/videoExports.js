import request from "./client.js";

export const listVideoExports = () =>
  request("/video-exports", { method: "GET" });

export const saveVideoExport = ({ manifest, runId, name, version, scriptText, interpolatedScript }) =>
  request("/video-exports", {
    method: "POST",
    body: JSON.stringify({
      manifest,
      runId,
      name,
      version,
      scriptText,
      interpolatedScript,
    }),
  });

export const getVideoExport = (id) =>
  request(`/video-exports/${encodeURIComponent(id)}`, { method: "GET" });

