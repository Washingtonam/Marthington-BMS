import { beforeEach, describe, expect, it } from "vitest";
import {
  buildVideoExportPackage,
  getLocalVideoExport,
  reloadVideoExportPackage,
  saveLocalVideoExport,
  VIDEO_EXPORT_STORAGE_KEY,
} from "../video/exportService.js";

describe("script-to-video export package builder", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds a complete versioned manifest with demo metadata", () => {
    const packageRecord = buildVideoExportPackage({
      name: "Adex Stores presentation",
      videoConfig: {
        video: {
          width: 1080,
          height: 1920,
          aspectRatio: "9:16",
          targetOutputResolutions: ["1080x1920"],
        },
        account: {
          type: "demo",
          isDemo: true,
          showDemoLabel: true,
          showDemoWatermark: true,
        },
      },
      script: "Welcome to Adex Stores.",
      narrationScript: "Welcome to Adex Stores.",
      brandingProfile: {
        businessName: "John Smith Store",
        phone: "08000000000",
        email: "john@example.com",
      },
      sceneTimeline: [
        { sceneKey: "dashboard_overview", narration: "Open the dashboard." },
      ],
      substitutionLog: [
        { from: "Adex Stores", to: "John Smith Store", source: "business-name" },
      ],
    });

    expect(packageRecord.version).toBe(1);
    expect(packageRecord.runId).toMatch(/^video-/);
    expect(packageRecord.manifest.video).toMatchObject({
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
      targetResolution: "1080x1920",
    });
    expect(packageRecord.manifest.account).toEqual({
      type: "demo",
      isDemo: true,
      showDemoLabel: false,
      showDemoWatermark: false,
    });
    expect(packageRecord.manifest.branding.businessName).toBe("John Smith Store");
    expect(packageRecord.manifest.script.interpolated).toBe("Welcome to John Smith Store.");
    expect(packageRecord.manifest.substitutions.replacementCount).toBe(1);
  });

  it("increments versions and reloads exact past package state locally", () => {
    const first = buildVideoExportPackage({ name: "Versioned export" });
    saveLocalVideoExport(first);
    const second = buildVideoExportPackage({ name: "Versioned export" });

    expect(second.version).toBe(2);
    saveLocalVideoExport(second);
    expect(getLocalVideoExport(first.runId)?.manifest.name).toBe("Versioned export");
    expect(reloadVideoExportPackage(second.runId)?.version).toBe(2);
    expect(localStorage.getItem(VIDEO_EXPORT_STORAGE_KEY)).toBeTruthy();
  });

  it("defaults missing video dimensions to 1920x1080", () => {
    const packageRecord = buildVideoExportPackage({ script: "Narration only." });
    expect(packageRecord.manifest.video).toMatchObject({
      width: 1920,
      height: 1080,
      targetResolution: "1920x1080",
    });
  });
});
