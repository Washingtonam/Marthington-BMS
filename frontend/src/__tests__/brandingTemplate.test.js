import { describe, expect, it } from "vitest";
import {
  applyBrandingToValue,
  interpolateBrandingTemplate,
  replaceBrandName,
} from "../utils/brandingTemplate.js";
import { normalizeBrandingProfile } from "../context/BrandingContext.jsx";

describe("branding template utilities", () => {
  it("interpolates business credentials", () => {
    const template = "{{businessName}} | {{phone}} | {{email}} | {{address}}";
    expect(interpolateBrandingTemplate(template, {
      businessName: "Adex Stores",
      phone: "08000000000",
      email: "hello@adex.test",
      address: "Lagos",
    })).toBe("Adex Stores | 08000000000 | hello@adex.test | Lagos");
  });

  it("replaces known default business names and placeholder values", () => {
    const result = replaceBrandName(
      "Steve Computer Warehouse welcomes you to Adex Stores.",
      { businessName: "John Smith Store" }
    );
    expect(result).toBe("John Smith Store welcomes you to John Smith Store.");
    expect(replaceBrandName("Welcome to {{shopName}}", { businessName: "Adex Stores" }))
      .toBe("Welcome to Adex Stores");
  });

  it("applies branding recursively without changing non-string state", () => {
    const result = applyBrandingToValue({
      heading: "{{businessName}} Dashboard",
      active: true,
      nested: ["Steve Computer Warehouse", 42],
    }, { businessName: "Adex Stores" });
    expect(result).toEqual({
      heading: "Adex Stores Dashboard",
      active: true,
      nested: ["Adex Stores", 42],
    });
  });

  it("normalizes profile aliases", () => {
    expect(normalizeBrandingProfile({
      name: "John Smith Store",
      phoneNumber: "123",
      logo: "/john.png",
      primaryColor: "#2563eb",
    })).toMatchObject({
      businessName: "John Smith Store",
      phone: "123",
      logoUrl: "/john.png",
      accentTheme: "#2563eb",
    });
  });
});
