import { describe, expect, it } from "vitest";
import {
  calculateMarkup,
  suggestSellingPrice
} from "../utils/productPricing.js";

describe("product pricing", () => {
  it("suggests a selling price using the full markup precision", () => {
    expect(suggestSellingPrice("100", "12.34567")).toBe("112.34567");
  });

  it("reverse-calculates the markup for a manually entered selling price", () => {
    expect(calculateMarkup("1500", "1899.99")).toBe(String(((1899.99 / 1500) - 1) * 100));
  });

  it("returns no markup when a positive cost is not available", () => {
    expect(calculateMarkup("0", "10")).toBe("");
  });
});
