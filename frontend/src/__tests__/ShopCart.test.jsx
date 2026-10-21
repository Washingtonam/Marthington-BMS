import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ShopCart from "../pages/ShopCart.jsx";
import { refreshShopCartItems, shopRequest } from "../api/shop.js";
import { ShopCartProvider } from "../context/ShopCartContext.jsx";

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: vi.fn(), refreshShopCartItems: vi.fn() };
});

const savedItem = {
  id: "product-1",
  name: "Market basket",
  category: "Home",
  price: 1800,
  originalPrice: 1800,
  salePrice: 0,
  available: true,
  canPurchase: true,
  image: "",
  business: { name: "Market Goods" },
  quantity: 2
};

const renderCart = () => render(
  <MemoryRouter initialEntries={["/shop/cart"]}>
    <ShopCartProvider>
      <ShopCart />
    </ShopCartProvider>
  </MemoryRouter>
);

describe("Storefront cart price refresh", () => {
  beforeEach(() => {
    localStorage.setItem("marthington_shop_cart", JSON.stringify([savedItem]));
    shopRequest.mockReset();
    refreshShopCartItems.mockReset();
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("marthington_shop_cart");
  });

  it("refreshes saved cart prices from the current storefront price", async () => {
    refreshShopCartItems.mockResolvedValue([{
      ...savedItem,
      price: 1500,
      originalPrice: 2000,
      salePrice: 1500
    }]);

    renderCart();

    expect(await screen.findByText("₦1,500")).toBeTruthy();
    expect(screen.getByText("₦2,000")).toBeTruthy();
    expect(screen.getAllByText("₦3,000")).toHaveLength(2);
    await waitFor(() => expect(JSON.parse(localStorage.getItem("marthington_shop_cart"))[0].price).toBe(1500));
    expect(screen.getByRole("button", { name: "Continue to checkout" }).hasAttribute("disabled")).toBe(false);
  });

  it("blocks checkout when a saved product is no longer listed", async () => {
    refreshShopCartItems.mockResolvedValue([{
      ...savedItem,
      available: false,
      canPurchase: false
    }]);

    renderCart();

    expect(await screen.findByText(/currently unavailable for purchase/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue to checkout" }).hasAttribute("disabled")).toBe(true);
  });
});
