// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: { role: "owner" }
  })
}));

vi.mock("../api/branches.js", () => ({
  getBranches: vi.fn(async () => []),
  getProductNameAudit: vi.fn(async () => ({
    groups: [{
      type: "duplicate",
      products: [
        { _id: "product-1", name: "USB Mouse", sku: "MOUSE-1", stock: 5, price: 20, costPrice: 10 },
        { _id: "product-2", name: "usb-mouse", sku: "MOUSE-2", stock: 3, price: 22, costPrice: 12 }
      ],
      keptSeparatePairs: []
    }],
    totalGroups: 1,
    scannedProducts: 2,
    truncated: false
  })),
  getProductMergePreview: vi.fn(async () => ({
    primary: {
      _id: "product-1", name: "USB Mouse", sku: "MOUSE-1",
      stock: 5, sellingPrice: 20, costPrice: 10, references: {}
    },
    secondary: {
      _id: "product-2", name: "usb-mouse", sku: "MOUSE-2",
      stock: 3, sellingPrice: 22, costPrice: 12, references: {}
    },
    locations: [],
    warning: "This operation merges the products across head office and every branch."
  })),
  keepCatalogProductsSeparate: vi.fn(),
  mergeCatalogProducts: vi.fn(async () => ({ message: "Products merged successfully." }))
}));

import { MemoryRouter } from "react-router-dom";
import { getProductMergePreview, mergeCatalogProducts } from "../api/branches.js";
import ProductNameReview from "../pages/ProductNameReview.jsx";

describe("product name review", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("previews the selected stock policy and confirms a business-wide merge", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={["/app/product-name-review?branchId=headOffice"]}>
        <ProductNameReview />
      </MemoryRouter>
    );

    await screen.findByText("USB Mouse", { exact: true });
    fireEvent.click(screen.getByRole("button", { name: /USB Mouse/ }));
    fireEvent.click(screen.getByRole("button", { name: /usb-mouse/ }));
    fireEvent.click(screen.getByRole("button", { name: "Compare merge impact" }));

    const projectedResult = await screen.findByText("Projected head-office result:");
    expect(projectedResult.parentElement.textContent).toContain("8 units");
    expect(getProductMergePreview).toHaveBeenCalledWith("product-1", "product-2");

    fireEvent.click(screen.getByRole("button", { name: "Confirm merge" }));
    await waitFor(() => {
      expect(mergeCatalogProducts).toHaveBeenCalledWith({
        primaryId: "product-1",
        secondaryId: "product-2",
        stockPolicy: "sum",
        sellingPricePolicy: "primary",
        costPricePolicy: "weighted-average"
      });
    });
  });
});
