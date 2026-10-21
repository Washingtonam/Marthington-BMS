import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { ShopCartProvider } from "../context/ShopCartContext.jsx";
import ShopProduct from "../pages/ShopProduct.jsx";

const mockShopRequest = vi.fn();

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: (...args) => mockShopRequest(...args) };
});

const StorefrontContext = () => <Outlet context={{ settings: { whatsappNumber: "2348012345678" }, customer: { name: "Ada Owner", phone: "08012345678" } }} />;

afterEach(() => {
  cleanup();
  mockShopRequest.mockReset();
});

describe("Storefront product details", () => {
  it("shows WhatsApp inquiries and only the related featured products returned for the supplier", async () => {
    mockShopRequest.mockResolvedValue({
      product: {
        id: "product-1",
        name: "Market basket",
        category: "Home",
        price: 2500,
        available: true,
        canPurchase: true,
        featured: false,
        business: { name: "Market Goods" },
        relatedFeatured: [{
          id: "product-2",
          name: "Featured bowl",
          category: "Home",
          price: 1500,
          available: true,
          canPurchase: true,
          image: "",
          business: { name: "Market Goods" }
        }]
      }
    });

    render(
      <MemoryRouter initialEntries={["/shop/product/product-1"]}>
        <ShopCartProvider>
          <Routes>
            <Route path="/shop" element={<StorefrontContext />}>
              <Route path="product/:id" element={<ShopProduct />} />
            </Route>
          </Routes>
        </ShopCartProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Market basket" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ask about this on WhatsApp" }).getAttribute("href")).toContain("wa.me/2348012345678");
    expect(decodeURIComponent(screen.getByRole("link", { name: "Ask about this on WhatsApp" }).getAttribute("href"))).toContain("Ada Owner");
    expect(screen.getByRole("region", { name: "More featured products from Market Goods" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Featured bowl/ }).getAttribute("href")).toBe("/shop/product/product-2");
  });
});
