import { describe, expect, it } from "vitest";
import {
  injectBusinessConfiguration,
  injectConfigurationIntoState,
  parseScriptVideoConfig,
} from "../utils/scriptParser.js";

describe("parseScriptVideoConfig", () => {
  it("uses production-safe defaults for missing configuration", () => {
    const parsed = parseScriptVideoConfig("Welcome to the shop.");

    expect(parsed.video).toEqual({
      width: 1920,
      height: 1080,
      aspectRatio: "16:9",
      targetResolution: "1920x1080",
      targetOutputResolutions: ["1920x1080"],
    });
    expect(parsed.account).toEqual({
      type: "demo",
      isDemo: true,
      showDemoLabel: false,
      showDemoWatermark: false,
    });
    expect(parsed.validation.valid).toBe(true);
  });

  it("parses dimensions, target resolutions, and front matter", () => {
    const parsed = parseScriptVideoConfig(`---
dimensions:
  width: 1080
  height: 1920
aspectRatio: 9:16
business:
  name: John Smith Store
account:
  type: live
  isDemo: false
---
Welcome to {{shopName}}.`);

    expect(parsed.video.width).toBe(1080);
    expect(parsed.video.height).toBe(1920);
    expect(parsed.video.aspectRatio).toBe("9:16");
    expect(parsed.business.name).toBe("John Smith Store");
    expect(parsed.account.type).toBe("live");
    expect(parsed.script).toBe("Welcome to {{shopName}}.");
  });

  it("falls back from invalid dimensions and account values", () => {
    const parsed = parseScriptVideoConfig({
      video: { width: -10, height: 720, aspectRatio: "not-an-aspect" },
      account: { type: "preview" },
    });

    expect(parsed.video.width).toBe(1920);
    expect(parsed.video.height).toBe(720);
    expect(parsed.video.aspectRatio).toBe("8:3");
    expect(parsed.account.type).toBe("demo");
    expect(parsed.validation.warnings.length).toBeGreaterThan(0);
  });

  it("injects names into narration and component state without creating a demo watermark", () => {
    const config = parseScriptVideoConfig({
      metadata: {
        businessName: "John Smith Store",
        replacements: { "Adex Stores": "John Smith Store" },
      },
      script: "Adex Stores is ready.",
      account: { type: "demo", showDemoWatermark: true, showDemoLabel: true },
    });

    expect(injectBusinessConfiguration("Welcome to Adex Stores", config))
      .toBe("Welcome to John Smith Store");
    expect(injectBusinessConfiguration("Welcome to {{shopName}}", config))
      .toBe("Welcome to John Smith Store");

    const state = injectConfigurationIntoState({
      title: "{{businessName}} Dashboard",
      account: { label: "Internal account" },
    }, config);

    expect(state.title).toBe("John Smith Store Dashboard");
    expect(state.businessName).toBe("John Smith Store");
    expect(state.accountMetadata.showDemoLabel).toBe(false);
    expect(state.accountMetadata.showDemoWatermark).toBe(false);
  });
});
