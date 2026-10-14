import { afterEach, describe, expect, it } from "vitest";
import { applyAccentColor, applyColorMode, defaultAccentColor, getColorMode } from "../utils/appearance.js";

describe("shared appearance preferences", () => {
  afterEach(() => {
    localStorage.removeItem("theme");
    localStorage.removeItem("partner-theme");
    delete document.documentElement.dataset.accentColor;
  });

  it("keeps light and dark mode in the same preference across modes", () => {
    applyColorMode("light");
    expect(getColorMode()).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    applyColorMode("dark");
    expect(getColorMode()).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("partner-theme")).toBe("dark");
  });

  it("uses the previous partner preference when migrating existing sessions", () => {
    localStorage.setItem("partner-theme", "light");
    expect(getColorMode()).toBe("light");
  });

  it("applies a custom accent palette and falls back from invalid colors", () => {
    applyAccentColor("#2563eb");
    expect(document.documentElement.dataset.accentColor).toBe("#2563eb");
    expect(document.documentElement.style.getPropertyValue("--app-emerald-500")).toBe("37 99 235");

    applyAccentColor("not-a-color");
    expect(document.documentElement.dataset.accentColor).toBe(defaultAccentColor);
  });
});
