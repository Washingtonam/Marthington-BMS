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
  it("shows WhatsApp inquiries, same-business products, and discoveries from other businesses", async () => {
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
        relatedProducts: [{
          id: "product-2",
          name: "Everyday bowl",
          category: "Home",
          price: 1500,
          available: true,
          canPurchase: true,
          image: "",
          featured: false,
          business: { name: "Market Goods" }
        }],
        discoverProducts: [{
          id: "product-3",
          name: "Handmade lamp",
          category: "Decor",
          price: 4500,
          available: true,
          canPurchase: true,
          image: "",
          featured: true,
          business: { name: "Bright Home" }
        }, {
          id: "product-4",
          name: "Leather wallet",
          category: "Accessories",
          price: 3000,
          available: true,
          canPurchase: true,
          image: "",
          featured: false,
          business: { name: "Craft Corner" }
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
    expect(screen.getByRole("region", { name: "More products from Market Goods" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Everyday bowl/ }).getAttribute("href")).toBe("/shop/product/product-2");
    expect(screen.getByRole("region", { name: "Explore products from other businesses" })).toBeTruthy();
    expect(screen.getByText("From Bright Home")).toBeTruthy();
    expect(screen.getByText("From Craft Corner")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Handmade lamp/ }).getAttribute("href")).toBe("/shop/product/product-3");
    expect(screen.getByRole("link", { name: /Leather wallet/ }).getAttribute("href")).toBe("/shop/product/product-4");
  });
});
