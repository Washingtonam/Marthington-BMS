import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ShopCartProvider, useShopCart } from "../context/ShopCartContext.jsx";
import Shop from "../pages/Shop.jsx";
import { shopRequest } from "../api/shop.js";

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: vi.fn() };
});

const CartCount = () => {
  const { count } = useShopCart();
  return <span>Cart items: {count}</span>;
};

const renderShop = () => render(
  <MemoryRouter initialEntries={["/shop"]}>
    <ShopCartProvider>
      <CartCount />
      <Shop />
    </ShopCartProvider>
  </MemoryRouter>
);

describe("Marthington Shop catalogue", () => {
  beforeEach(() => {
    localStorage.removeItem("marthington_shop_cart");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows automatically listed products and adds available items to the cart", async () => {
    shopRequest.mockResolvedValue({
      products: [{
        id: "product-1",
        name: "Market basket",
        category: "Home",
        price: 2500,
        available: true,
        canPurchase: true,
        image: "",
        business: { name: "Market Goods" }
      }],
      categories: ["Home"],
      pagination: { currentPage: 1, totalPages: 1, totalProducts: 1 }
    });

    renderShop();

    fireEvent.click(await screen.findByRole("button", { name: "Add to cart" }));

    expect(screen.getByText("Market basket")).toBeTruthy();
    expect(screen.getByText("Supplied by Market Goods")).toBeTruthy();
    expect(screen.getByText("Cart items: 1")).toBeTruthy();
  });

  it("keeps products visible but prevents purchase when they are unavailable", async () => {
    shopRequest.mockResolvedValue({
      products: [{
        id: "product-2",
        name: "Sold-out item",
        category: "Home",
        price: 1500,
        available: false,
        canPurchase: false,
        image: "",
        business: { name: "Market Goods" }
      }],
      categories: ["Home"],
      pagination: { currentPage: 1, totalPages: 1, totalProducts: 1 }
    });

    renderShop();

    expect(await screen.findByText("Sold-out item")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Out of stock" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Cart items: 0")).toBeTruthy();
  });
});
