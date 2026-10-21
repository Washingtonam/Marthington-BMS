// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ShopLayout from "../components/shop/ShopLayout.jsx";
import { ShopCartProvider } from "../context/ShopCartContext.jsx";

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
const { mockShopRequest } = vi.hoisted(() => ({ mockShopRequest: vi.fn() }));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("../components/AdminModeToggle.jsx", () => ({
  default: () => <button type="button">Mode</button>
}));

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: (...args) => mockShopRequest(...args) };
});

describe("Storefront navigation", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    mockShopRequest.mockReset();
  });

  it("shows a collapsible storefront sidebar with categories and management navigation", async () => {
    mockShopRequest.mockImplementation((path) => Promise.resolve(path === "/categories" ? { categories: ["Home", "Electronics"] } : { settings: {} }));
    mockUseAuth.mockReturnValue({ user: { role: "owner" }, business: null });
    render(<ShopCartProvider><MemoryRouter><ShopLayout /></MemoryRouter></ShopCartProvider>);

    expect(await screen.findByRole("navigation", { name: "Storefront categories" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Marthington Storefront home" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Home/ }).getAttribute("href")).toBe("/shop?category=Home");
    expect(screen.getByRole("link", { name: /Electronics/ }).getAttribute("href")).toBe("/shop?category=Electronics");
    expect(screen.getByRole("link", { name: "Cart (0)" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Manage storefront/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "BMS home" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
  });

  it("keeps order history, profile, and storefront administration available to signed-in shoppers and admins", () => {
    mockShopRequest.mockImplementation((path) => Promise.resolve(path === "/customers/me"
      ? { customer: { id: "shopper", name: "Shopper" } }
      : path === "/categories" ? { categories: [] } : { settings: {} }));
    localStorage.setItem("marthington_shop_token", "shop-token");
    localStorage.setItem("marthington_shop_customer", JSON.stringify({ id: "shopper" }));
    mockUseAuth.mockReturnValue({ user: { role: "super_admin" }, business: null });
    render(<ShopCartProvider><MemoryRouter><ShopLayout /></MemoryRouter></ShopCartProvider>);

    expect(screen.getByRole("link", { name: /My orders/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Profile & settings/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Storefront admin/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeTruthy();
  });

  it("searches products from conversational storefront assistant questions", async () => {
    mockShopRequest.mockImplementation((path) => Promise.resolve(
      path === "/categories" ? { categories: [] }
        : path === "/settings" ? { settings: {} }
          : { products: [{ id: "laptop-1", name: "Marthington Laptop", price: 150000, available: true }] }
    ));
    mockUseAuth.mockReturnValue({ user: null, business: null });
    render(<ShopCartProvider><MemoryRouter><ShopLayout /></MemoryRouter></ShopCartProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Ask us" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ask the storefront assistant" }), { target: { value: "How much is laptop?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("link", { name: /Marthington Laptop/ })).toBeTruthy();
    expect(mockShopRequest).toHaveBeenCalledWith("/?page=1&limit=8&search=laptop");
  });
});
