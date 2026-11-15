// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
        { _id: "product-2", name: "usb-mouse", sku: "MOUSE-2", stock: 3, price: 22, costPrice: 12 },
        { _id: "product-3", name: "USB Mouse Compact", sku: "MOUSE-3", stock: 4, price: 18, costPrice: 8 }
      ],
      keptSeparatePairs: []
    }],
    totalGroups: 1,
    scannedProducts: 3,
    truncated: false
  })),
  getProductMergePreview: vi.fn(async () => ({
    products: [
      { _id: "product-1", name: "USB Mouse", sku: "MOUSE-1", stock: 5, sellingPrice: 20, costPrice: 10, references: {} },
      { _id: "product-2", name: "usb-mouse", sku: "MOUSE-2", stock: 3, sellingPrice: 22, costPrice: 12, references: {} },
      { _id: "product-3", name: "USB Mouse Compact", sku: "MOUSE-3", stock: 4, sellingPrice: 18, costPrice: 8, references: {} }
    ],
    locations: [],
    warning: "This operation merges the products across head office and every branch."
  })),
  keepCatalogProductsSeparate: vi.fn(async () => ({ message: "Saved: all selected products will remain separate from one another." })),
  mergeCatalogProducts: vi.fn(async () => ({ message: "Products merged successfully." }))
}));

import { MemoryRouter } from "react-router-dom";
import {
  getProductMergePreview,
  getProductNameAudit,
  keepCatalogProductsSeparate,
  mergeCatalogProducts
} from "../api/branches.js";
import ProductNameReview from "../pages/ProductNameReview.jsx";

describe("product name review", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("previews a group merge and confirms the selected policies", async () => {
    render(
      <MemoryRouter initialEntries={["/app/product-name-review?branchId=headOffice"]}>
        <ProductNameReview />
      </MemoryRouter>
    );

    await screen.findByText("USB Mouse", { exact: true });
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-1/ }));
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-2/ }));
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-3/ }));
    fireEvent.click(screen.getByRole("button", { name: "Compare merge impact" }));

    expect(await screen.findByRole("dialog", { name: "Merge impact and rules" })).toBeTruthy();
    const projectedResult = await screen.findByText("Projected head-office result:");
    expect(projectedResult.parentElement.textContent).toContain("12 units");
    expect(getProductMergePreview).toHaveBeenCalledWith(["product-1", "product-2", "product-3"]);

    fireEvent.change(screen.getByLabelText("Stock at each location"), { target: { value: "product-3" } });
    fireEvent.change(screen.getByLabelText("Selling price"), { target: { value: "product-3" } });
    fireEvent.change(screen.getByLabelText("Cost price"), { target: { value: "product-3" } });
    expect(projectedResult.parentElement.textContent).toContain("4 units");

    fireEvent.click(screen.getByRole("button", { name: "Confirm merge" }));
    await waitFor(() => {
      expect(mergeCatalogProducts).toHaveBeenCalledWith({
        primaryId: "product-1",
        secondaryIds: ["product-2", "product-3"],
        stockPolicy: "product-3",
        sellingPricePolicy: "product-3",
        costPricePolicy: "product-3"
      });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes the merge review without changing the product selection", async () => {
    render(
      <MemoryRouter initialEntries={["/app/product-name-review?branchId=headOffice"]}>
        <ProductNameReview />
      </MemoryRouter>
    );

    await screen.findByText("USB Mouse", { exact: true });
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-1/ }));
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Compare merge impact" }));
    await screen.findByRole("dialog", { name: "Merge impact and rules" });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Compare merge impact" })).toBeTruthy();
  });

  it("can mark all selected products to stay separate", async () => {
    render(
      <MemoryRouter initialEntries={["/app/product-name-review?branchId=headOffice"]}>
        <ProductNameReview />
      </MemoryRouter>
    );

    await screen.findByText("USB Mouse", { exact: true });
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-1/ }));
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-2/ }));
    fireEvent.click(screen.getByRole("button", { name: /MOUSE-3/ }));
    fireEvent.click(screen.getByRole("button", { name: "Keep selected separate" }));

    await waitFor(() => expect(keepCatalogProductsSeparate).toHaveBeenCalledWith({
      branchId: "headOffice",
      productIds: ["product-1", "product-2", "product-3"],
      keepSeparate: true
    }));
  });

  it("moves an acknowledged similar-name pair into its own section", async () => {
    const similarGroup = {
      type: "similar",
      products: [
        { _id: "similar-1", name: "Measuring Tape 10m", sku: "TAPE-10", stock: 4, price: 10 },
        { _id: "similar-2", name: "Measuring Tape 1.5m", sku: "TAPE-15", stock: 7, price: 6 }
      ],
      keptSeparatePairs: []
    };
    getProductNameAudit
      .mockImplementationOnce(async () => ({
        groups: [similarGroup],
        totalGroups: 1,
        scannedProducts: 2,
        truncated: false
      }))
      .mockImplementationOnce(async () => ({
        groups: [{ ...similarGroup, keptSeparatePairs: [["similar-1", "similar-2"]] }],
        totalGroups: 1,
        scannedProducts: 2,
        truncated: false
      }));

    render(
      <MemoryRouter initialEntries={["/app/product-name-review?branchId=headOffice"]}>
        <ProductNameReview />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /TAPE-10/ }));
    fireEvent.click(screen.getByRole("button", { name: /TAPE-15/ }));
    fireEvent.click(screen.getByRole("button", { name: "Keep selected separate" }));

    const acknowledgedSection = await screen.findByRole("region", { name: /Acknowledged as separate/ });
    expect(within(acknowledgedSection).getByText("Measuring Tape 10m")).toBeTruthy();
    expect(within(acknowledgedSection).getByText("Measuring Tape 1.5m")).toBeTruthy();
    expect(screen.queryByRole("region", { name: /Possible similar names/ })).toBeNull();
  });
});
