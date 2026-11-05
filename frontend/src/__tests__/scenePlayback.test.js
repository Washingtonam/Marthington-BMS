import { describe, expect, it, vi } from "vitest";
import { getSceneMapping, SCENE_REGISTRY } from "../video/sceneRegistry.js";
import {
  calculateNarrationTiming,
  parseNarrationScenes,
  synchronizeNarrationSegments,
  applyBrandingToScene,
} from "../video/narrationSync.js";
import { createScenePlaybackService } from "../video/scenePlayback.js";

describe("scene mapping and narration sync", () => {
  it("maps script keys to real application routes", () => {
    expect(getSceneMapping("dashboard_overview").route).toBe("/app");
    expect(getSceneMapping("pos_checkout").targetComponent).toBe("POS");
    expect(getSceneMapping("suppliers_page").route).toBe("/app/suppliers");
    expect(getSceneMapping("team_permissions").route).toBe("/app/staff");
    expect(Object.keys(SCENE_REGISTRY).length).toBeGreaterThanOrEqual(5);
  });

  it("calculates word-count durations and cumulative timing", () => {
    const segments = synchronizeNarrationSegments([
      { sceneKey: "dashboard_overview", narration: "one two three" },
      { sceneKey: "pos_checkout", narration: "four five six seven eight nine" },
    ], { wordsPerMinute: 60, minimumDurationMs: 0 });

    expect(calculateNarrationTiming({ narration: "", minimumDurationMs: 0 }).wordCount).toBe(0);
    expect(segments[0].startMs).toBe(0);
    expect(segments[0].durationMs ?? segments[0].timing.durationMs).toBe(3000);
    expect(segments[1].startMs).toBe(3000);
  });

  it("parses markdown-style scene headings", () => {
    const parsed = parseNarrationScenes(`
## dashboard_overview
This is the dashboard.
### pos_checkout
Check out the customer.
`);
    expect(parsed.map((item) => item.sceneKey)).toEqual(["dashboard_overview", "pos_checkout"]);
    expect(parsed[1].narration).toContain("Check out the customer.");
  });

  it("substitutes branding in scenes and demo state", () => {
    const branded = applyBrandingToScene({
      sceneKey: "dashboard_overview",
      narration: "Welcome to Adex Stores.",
    }, { businessName: "John Smith Store" });
    expect(branded.narration).toBe("Welcome to John Smith Store.");
    expect(branded.route).toBe("/app");
  });

  it("activates scenes through the playback navigation service", () => {
    const navigate = vi.fn();
    const activateProfile = vi.fn();
    const service = createScenePlaybackService({ navigate, activateProfile });

    service.activateScene("invoice_management", {
      brandingProfile: { businessName: "Adex Stores" },
    });

    expect(navigate).toHaveBeenCalledWith("/app/invoices", expect.objectContaining({
      state: expect.objectContaining({
        sceneKey: "invoice_management",
        targetComponent: "Invoices",
      }),
    }));
    expect(activateProfile).toHaveBeenCalledWith({ businessName: "Adex Stores" });
  });
});
