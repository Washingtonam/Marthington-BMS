// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ShopLayout from "../components/shop/ShopLayout.jsx";
import { ShopCartProvider } from "../context/ShopCartContext.jsx";

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("../components/AdminModeToggle.jsx", () => ({
  default: () => <button type="button">Mode</button>
}));

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: vi.fn().mockResolvedValue({ customer: null }) };
});

describe("Storefront navigation", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("keeps storefront management and navigation links available in the responsive menu", () => {
    mockUseAuth.mockReturnValue({ user: { role: "owner" }, business: null });
    render(<ShopCartProvider><MemoryRouter><ShopLayout /></MemoryRouter></ShopCartProvider>);

    const navigation = screen.getByRole("navigation", { name: "Storefront navigation" });
    expect(navigation.className).toContain("flex-wrap");
    expect(screen.getByRole("link", { name: "Storefront" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cart (0)" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Manage storefront" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "BMS home" })).toBeTruthy();
    expect(navigation.querySelector(".hidden")).toBeNull();
  });

  it("keeps order history and storefront administration available for signed-in shoppers and admins", () => {
    localStorage.setItem("marthington_shop_token", "shop-token");
    localStorage.setItem("marthington_shop_customer", JSON.stringify({ id: "shopper" }));
    mockUseAuth.mockReturnValue({ user: { role: "super_admin" }, business: null });
    render(<ShopCartProvider><MemoryRouter><ShopLayout /></MemoryRouter></ShopCartProvider>);

    expect(screen.getByRole("link", { name: "My orders" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Storefront admin" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});
