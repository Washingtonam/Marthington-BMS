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
    shopRequest.mockImplementation((path) => {
      if (path === "/storefront/products/product-1") {
        return Promise.resolve({ product: { ...storefrontData.products[0], shopDescription: "Updated storefront description" } });
      }
      if (path === "/storefront/products") return Promise.resolve({ updatedCount: 1 });
      return Promise.resolve(storefrontData);
    });
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
    expect(screen.getByRole("link", { name: "Edit product in BMS" }).getAttribute("href")).toBe("/app/products?edit=product-1");

    fireEvent.change(screen.getByLabelText("Storefront description"), { target: { value: "Updated storefront description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save storefront details" }));

    await waitFor(() => {
      const [, options] = shopRequest.mock.calls.find(([path]) => path === "/storefront/products/product-1");
      expect(options.method).toBe("PATCH");
      expect(options.body.get("shopDescription")).toBe("Updated storefront description");
      expect(options.token).toBe("owner-token");
    });
  });

  it("lets owners paste a Cloudinary URL while restricting settings to images and descriptions", async () => {
    render(<MemoryRouter><ShopStorefront /></MemoryRouter>);

    await screen.findByRole("heading", { name: "Laptop" });
    fireEvent.change(screen.getByLabelText("Laptop Cloudinary image URL"), {
      target: { value: "https://res.cloudinary.com/demo/image/upload/laptop.jpg" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save storefront details" }));

    await waitFor(() => {
      const [, options] = shopRequest.mock.calls.find(([path]) => path === "/storefront/products/product-1");
      expect(options.body.get("shopImageUrl")).toBe("https://res.cloudinary.com/demo/image/upload/laptop.jpg");
      expect(options.body.has("shopFeatured")).toBe(false);
      expect(options.body.has("shopSalePrice")).toBe(false);
      expect(options.body.has("shopVisible")).toBe(false);
    });
    expect(screen.queryByLabelText(/Feature Laptop/)).toBeNull();
    expect(screen.queryByLabelText(/storefront discount/i)).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Select Laptop" })).toBeNull();
  });

  it("does not treat an unset legacy business visibility as hidden", async () => {
    shopRequest.mockResolvedValueOnce({
      business: { name: "Legacy Business" },
      products: [],
      pagination: { currentPage: 1, totalPages: 1, totalProducts: 0 }
    });
    render(<MemoryRouter><ShopStorefront /></MemoryRouter>);

    await screen.findByRole("heading", { name: "Legacy Business storefront" });
    expect(screen.queryByText(/currently hidden from shoppers/)).toBeNull();
  });

  it("searches products without exposing listing visibility controls to owners", async () => {
    render(<MemoryRouter><ShopStorefront /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Laptop" });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search storefront products" }), {
      target: { value: "Laptop" }
    });
    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith(
        "/storefront/products?page=1&limit=12&search=Laptop",
        expect.objectContaining({ token: "owner-token" })
      );
    });

    expect(screen.queryByRole("button", { name: /selected products/i })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Select Laptop" })).toBeNull();
  });

  it("warns owners when the super admin explicitly hides their business", async () => {
    shopRequest.mockResolvedValueOnce({
      ...storefrontData,
      business: { ...storefrontData.business, shopVisible: false }
    });
    render(<MemoryRouter><ShopStorefront /></MemoryRouter>);

    expect(await screen.findByText(/currently hidden from shoppers/)).toBeTruthy();
  });
});
