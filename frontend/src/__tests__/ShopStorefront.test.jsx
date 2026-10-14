import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ShopStorefront from "../pages/ShopStorefront.jsx";
import { shopRequest } from "../api/shop.js";

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: vi.fn() };
});

const storefrontData = {
  business: { name: "Steve Computer Warehouse", shopVisible: true },
  products: [{
    _id: "product-1",
    name: "Laptop",
    category: "Computers",
    price: 200000,
    stock: 4,
    shopVisible: true,
    shopDescription: "Fast and reliable"
  }],
  pagination: { currentPage: 1, totalPages: 1, totalProducts: 1 }
};

describe("Owner storefront management", () => {
  beforeEach(() => {
    localStorage.setItem("bms_token", "owner-token");
    shopRequest.mockImplementation((path) => path === "/storefront/products/product-1"
      ? Promise.resolve({ product: { ...storefrontData.products[0], shopDescription: "Updated storefront description" } })
      : Promise.resolve(storefrontData));
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("bms_token");
    vi.clearAllMocks();
  });

  it("shows the business storefront and only allows storefront content edits", async () => {
    render(<MemoryRouter><ShopStorefront /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Steve Computer Warehouse storefront" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Laptop" })).toBeTruthy();
    expect(screen.getByLabelText("Storefront description").value).toBe("Fast and reliable");
    expect(screen.queryByLabelText("Product name")).toBeNull();

    fireEvent.change(screen.getByLabelText("Storefront description"), { target: { value: "Updated storefront description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save storefront details" }));

    await waitFor(() => {
      const [, options] = shopRequest.mock.calls.find(([path]) => path === "/storefront/products/product-1");
      expect(options.method).toBe("PATCH");
      expect(options.body.get("shopDescription")).toBe("Updated storefront description");
      expect(options.token).toBe("owner-token");
    });
  });
});
