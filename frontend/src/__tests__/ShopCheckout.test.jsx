import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ShopCheckout from "../pages/ShopCheckout.jsx";
import { refreshShopCartItems, shopRequest } from "../api/shop.js";
import { ShopCartProvider } from "../context/ShopCartContext.jsx";

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    refreshShopCartItems: vi.fn(),
    shopRequest: vi.fn()
  };
});

vi.mock("../components/LocationFields.jsx", () => ({
  default: () => <div>Delivery location</div>
}));

const oldCartItem = {
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

describe("Storefront checkout pricing", () => {
  beforeEach(() => {
    localStorage.setItem("marthington_shop_cart", JSON.stringify([oldCartItem]));
    localStorage.setItem("marthington_shop_token", "customer-token");
    localStorage.setItem("marthington_shop_customer", JSON.stringify({ email: "shopper@example.com" }));
    refreshShopCartItems.mockResolvedValue([{
      ...oldCartItem,
      price: 1500,
      originalPrice: 2000,
      salePrice: 1500
    }]);
    shopRequest.mockImplementation(async (path) => {
      if (path === "/customers/me") {
        return {
          customer: {
            email: "shopper@example.com",
            addresses: [{
              _id: "address-1",
              label: "Home",
              recipientName: "Shopper",
              addressLine: "1 Market Road",
              city: "Ikeja",
              state: "Lagos",
              country: "Nigeria",
              phone: "08000000000"
            }]
          }
        };
      }
      if (path === "/orders") {
        return { authorizationUrl: "#payment" };
      }
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("marthington_shop_cart");
    localStorage.removeItem("marthington_shop_token");
    localStorage.removeItem("marthington_shop_customer");
    vi.clearAllMocks();
  });

  it("submits the refreshed storefront price, not the stale saved cart price", async () => {
    render(
      <MemoryRouter initialEntries={["/shop/checkout"]}>
        <ShopCartProvider>
          <ShopCheckout />
        </ShopCartProvider>
      </MemoryRouter>
    );

    const payButton = await screen.findByRole("button", { name: "Pay ₦3,000 with Paystack" });
    await waitFor(() => expect(payButton.hasAttribute("disabled")).toBe(false));
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/orders", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          addressId: "address-1",
          items: [{ productId: "product-1", quantity: 2, expectedPrice: 1500 }]
        })
      }));
    });
  });

  it("lets the shopper refresh prices after the server rejects a stale checkout amount", async () => {
    const priceConflict = new Error("A product price changed. Please review your cart and try again.");
    priceConflict.status = 409;
    let orderAttempts = 0;
    shopRequest.mockImplementation(async (path) => {
      if (path === "/customers/me") {
        return {
          customer: {
            email: "shopper@example.com",
            addresses: [{
              _id: "address-1",
              label: "Home",
              recipientName: "Shopper",
              addressLine: "1 Market Road",
              city: "Ikeja",
              state: "Lagos",
              country: "Nigeria",
              phone: "08000000000"
            }]
          }
        };
      }
      if (path === "/orders") {
        orderAttempts += 1;
        if (orderAttempts === 1) throw priceConflict;
        return { authorizationUrl: "#payment" };
      }
      return {};
    });
    refreshShopCartItems
      .mockResolvedValueOnce([{
        ...oldCartItem,
        price: 1500,
        originalPrice: 2000,
        salePrice: 1500
      }])
      .mockResolvedValueOnce([{
        ...oldCartItem,
        price: 1200,
        originalPrice: 2000,
        salePrice: 1200
      }]);

    render(
      <MemoryRouter initialEntries={["/shop/checkout"]}>
        <ShopCartProvider>
          <ShopCheckout />
        </ShopCartProvider>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Pay ₦3,000 with Paystack" }));
    fireEvent.click(await screen.findByRole("button", { name: "Refresh prices and review cart" }));
    const updatedPayButton = await screen.findByRole("button", { name: "Pay ₦2,400 with Paystack" });
    await waitFor(() => expect(updatedPayButton.hasAttribute("disabled")).toBe(false));
    fireEvent.click(updatedPayButton);

    await waitFor(() => {
      expect(shopRequest).toHaveBeenLastCalledWith("/orders", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          addressId: "address-1",
          items: [{ productId: "product-1", quantity: 2, expectedPrice: 1200 }]
        })
      }));
    });
  });
});
