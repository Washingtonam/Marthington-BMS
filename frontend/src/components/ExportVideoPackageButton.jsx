import { useState } from "react";
import { saveVideoExport } from "../api/videoExports.js";
import { downloadVideoExportPackage } from "../video/exportService.js";

export default function ExportVideoPackageButton({
  packageInput,
  className = "",
  children = "Export script-to-video package",
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setWorking(true);
    setError("");
    try {
      const packageRecord = await downloadVideoExportPackage(packageInput);
      await saveVideoExport({
        manifest: packageRecord.manifest,
        runId: packageRecord.runId,
        name: packageRecord.name,
        version: packageRecord.version,
        scriptText: packageRecord.manifest.script.source,
        interpolatedScript: packageRecord.manifest.script.interpolated,
      }).catch((apiError) => {
        throw apiError;
      });
    } catch (exportError) {
      setError(exportError?.message || "Unable to export the video package.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className={className}
        onClick={handleExport}
        disabled={working || !packageInput}
      >
        {working ? "Preparing package..." : children}
      </button>
      {error && (
        <p className="mt-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
