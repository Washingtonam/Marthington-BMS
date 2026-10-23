import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ShopAdmin from "../pages/ShopAdmin.jsx";
import { shopRequest } from "../api/shop.js";

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: vi.fn() };
});

const renderShopAdmin = () => render(
  <MemoryRouter>
    <ShopAdmin />
  </MemoryRouter>
);

describe("Shop administration", () => {
  beforeEach(() => {
    localStorage.setItem("bms_token", "admin-token");
    shopRequest.mockImplementation(async (path) => {
      if (path === "/admin/categories") {
        return {
          categories: [{ _id: "category-1", name: "Gifts" }],
          sourceCategories: [{
            sourceCategory: "Gift set",
            variants: ["Gift set", "gift SET"],
            productsCount: 4,
            mappedCategoryId: ""
          }]
        };
      }
      if (path === "/admin/businesses") {
        return {
          businesses: [{
            _id: "business-1",
            name: "Market Goods",
            status: "active",
            shopVisible: true,
            productsCount: 8
          }]
        };
      }
      if (path === "/admin/delivery-areas") {
        return {
          areas: [{
            _id: "area-1",
            state: "Lagos",
            city: "Ikeja",
            fee: 2500,
            isActive: true
          }]
        };
      }
      if (path === "/admin/settings") {
        return {
          settings: {
            whatsappNumber: "2348012345678",
            accentColor: "#10b981",
            theme: "light"
          }
        };
      }
      if (path.startsWith("/admin/products?")) {
        return {
          products: [{
            _id: "product-1",
            name: "Gift set",
            category: "Gifts",
            price: 10000,
            stock: 3,
            shopFeatured: false,
            shopVisible: true
          }],
          pagination: { currentPage: 1, totalPages: 1, totalProducts: 1 }
        };
      }
      if (path === "/admin/orders") return { orders: [] };
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("bms_token");
    vi.clearAllMocks();
  });

  it("maps BMS category labels to a canonical shop category", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Categories" }));

    const mapping = await screen.findByRole("combobox", { name: "Map Gift set" });
    fireEvent.change(mapping, { target: { value: "category-1" } });

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/category-mappings", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ sourceCategory: "Gift set", categoryId: "category-1" })
      }));
    });
  });

  it("lets the super admin hide a BMS business from the shop", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Businesses" }));
    fireEvent.click(await screen.findByRole("button", { name: "Hide business" }));

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/businesses/business-1", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ shopVisible: false })
      }));
    });
  });

  it("saves the shared storefront theme, accent color, and shopper WhatsApp number", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Appearance & contact" }));

    fireEvent.change(await screen.findByRole("textbox", { name: "Marthington WhatsApp number" }), { target: { value: "+234 809 999 0000" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Color mode" }), { target: { value: "dark" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Storefront accent hex value" }), { target: { value: "#2563eb" } });
    fireEvent.click(screen.getByRole("button", { name: "Save storefront settings" }));

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/settings", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ whatsappNumber: "+234 809 999 0000", accentColor: "#2563eb", theme: "dark" })
      }));
    });
  });

  it("lets the super admin feature a product in storefront listings", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Products & images" }));
    const featured = await screen.findByRole("checkbox", { name: "Feature" });
    fireEvent.click(featured);

    await waitFor(() => {
      const updateCall = shopRequest.mock.calls.find(([path]) => path === "/admin/products/product-1");
      expect(updateCall).toBeTruthy();
      expect(updateCall[1].body.get("shopFeatured")).toBe("true");
    });
  });

  it("lets the super admin set a fixed sale price and Cloudinary image URL", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Products & images" }));
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Gift set storefront price" }), {
      target: { value: "7500" }
    });
    fireEvent.change(screen.getByLabelText("Gift set Cloudinary image URL"), {
      target: { value: "https://res.cloudinary.com/demo/image/upload/gift.jpg" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save product changes" }));

    await waitFor(() => {
      const updateCall = shopRequest.mock.calls.find(([path]) => path === "/admin/products/product-1");
      expect(updateCall[1].body.get("shopSalePrice")).toBe("7500");
      expect(updateCall[1].body.get("shopImageUrl")).toBe("https://res.cloudinary.com/demo/image/upload/gift.jpg");
    });
  });

  it("allows a storefront price above the BMS price as a direct price override", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Products & images" }));
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Gift set storefront price" }), {
      target: { value: "12000" }
    });
    fireEvent.change(screen.getByLabelText("Gift set storefront price mode"), {
      target: { value: "override" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save product changes" }));

    await waitFor(() => {
      const updateCall = shopRequest.mock.calls.find(([path]) => path === "/admin/products/product-1");
      expect(updateCall).toBeTruthy();
      expect(updateCall[1].body.get("shopSalePrice")).toBe("12000");
      expect(updateCall[1].body.get("shopPriceMode")).toBe("override");
    });
  });

  it("filters products without images and sends the filter to the admin API", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Products & images" }));
    fireEvent.change(await screen.findByRole("combobox", { name: "Filter products by image" }), {
      target: { value: "missing" }
    });

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith(
        "/admin/products?limit=100&search=&page=1&imageStatus=missing",
        expect.objectContaining({ token: "admin-token" })
      );
    });
  });

  it("filters products with storefront images and sends the filter to the admin API", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Products & images" }));
    fireEvent.change(await screen.findByRole("combobox", { name: "Filter products by image" }), {
      target: { value: "present" }
    });

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith(
        "/admin/products?limit=100&search=&page=1&imageStatus=present",
        expect.objectContaining({ token: "admin-token" })
      );
    });
  });

  it("filters products by source business", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Products & images" }));
    fireEvent.change(await screen.findByRole("combobox", { name: "Filter products by source business" }), {
      target: { value: "business-1" }
    });

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith(
        "/admin/products?limit=100&search=&page=1&businessId=business-1",
        expect.objectContaining({ token: "admin-token" })
      );
    });
    const selectedBusinessNotice = (content, element) =>
      element.tagName === "P" &&
      element.textContent.replace(/\s+/g, " ").trim() === "Showing 1 product from Market Goods.";
    expect(await screen.findByText(selectedBusinessNotice)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show all businesses" }));
    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith(
        "/admin/products?limit=100&search=&page=1",
        expect.objectContaining({ token: "admin-token" })
      );
    });
    expect(screen.queryByText(selectedBusinessNotice)).toBeNull();
  });

  it("shows a compact page-number window with nearby pages", async () => {
    shopRequest.mockImplementation(async (path) => {
      if (path === "/admin/orders") return { orders: [] };
      if (path.startsWith("/admin/products?")) {
        const page = Number(new URL(path, "http://localhost").searchParams.get("page"));
        return {
          products: [],
          pagination: { currentPage: page, totalPages: 12, totalProducts: 1200 }
        };
      }
      return {};
    });

    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Products & images" }));
    await screen.findByRole("button", { name: "Page 1" });
    for (let page = 1; page < 5; page += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect((await screen.findByRole("button", { name: "Page 5" })).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Page 3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 4" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 6" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 7" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Page 2" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Page 8" })).toBeNull();

    for (let page = 5; page < 12; page += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    expect((await screen.findByRole("button", { name: "Page 12" })).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Page 10" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 11" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Page 9" })).toBeNull();
    expect(screen.getByText((_, element) => element.tagName === "P" && element.textContent.replace(/\s+/g, " ").trim() === "Showing 1,101–1,200 of 1,200 products")).toBeTruthy();
  });

  it("lets the super admin add a delivery-area fee preset", async () => {
    renderShopAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Delivery areas" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "New delivery state" }), { target: { value: "Ogun" } });
    fireEvent.change(screen.getByRole("textbox", { name: "New delivery city or area" }), { target: { value: "Abeokuta" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "New delivery fee" }), { target: { value: "1800" } });
    fireEvent.click(screen.getByRole("button", { name: "Add area" }));

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/delivery-areas", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ state: "Ogun", city: "Abeokuta", fee: 1800 })
      }));
    });
  });

  it("lets the super admin request a partial refund", async () => {
    const order = {
      _id: "order-1",
      orderNumber: "MS-ORDER-1",
      customerSnapshot: { name: "Shopper", email: "shopper@example.com", phone: "08000000000" },
      createdAt: "2026-10-08T12:00:00.000Z",
      status: "received",
      paymentStatus: "paid",
      subtotal: 5000,
      deliveryFee: 0,
      deliveryFeePaymentStatus: "not_set",
      totalPaid: 5000,
      totalRefunded: 0,
      items: [{ productName: "Gift set", quantity: 1, supplierName: "Market Goods", supplierPhone: "" }],
      deliveryAddress: {
        recipientName: "Shopper",
        phone: "08000000000",
        addressLine: "1 Market Road",
        city: "Ikeja",
        state: "Lagos",
        deliveryNote: ""
      },
      adminNote: "",
      refunds: []
    };
    shopRequest.mockImplementation(async (path, options = {}) => {
      if (path === "/admin/orders") return { orders: [order] };
      if (path === "/admin/delivery-areas") return { areas: [] };
      if (path === "/admin/orders/order-1/refunds") {
        return { message: "Refund request submitted to Paystack and is pending." };
      }
      return {};
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderShopAdmin();
    await screen.findByText("MS-ORDER-1");
    fireEvent.change(screen.getByLabelText("Payment to refund"), { target: { value: "products" } });
    fireEvent.change(screen.getByLabelText("Refund amount (NGN)"), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "One item was unavailable" } });
    fireEvent.click(screen.getByRole("button", { name: "Request Paystack refund" }));

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/orders/order-1/refunds", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ source: "products", amount: 1500, reason: "One item was unavailable" })
      }));
    });
  });

  it("records an already completed refund for a manually paid delivery fee", async () => {
    const order = {
      _id: "order-manual-delivery",
      orderNumber: "MS-ORDER-2",
      customerSnapshot: { name: "Shopper", email: "shopper@example.com", phone: "08000000000" },
      createdAt: "2026-10-08T12:00:00.000Z",
      status: "received",
      paymentStatus: "complete",
      subtotal: 5000,
      deliveryFee: 1200,
      deliveryFeePaymentStatus: "paid",
      totalPaid: 6200,
      totalRefunded: 0,
      items: [{ productName: "Gift set", quantity: 1, supplierName: "Market Goods", supplierPhone: "" }],
      deliveryAddress: {
        recipientName: "Shopper",
        phone: "08000000000",
        addressLine: "1 Market Road",
        city: "Ikeja",
        state: "Lagos",
        deliveryNote: ""
      },
      adminNote: "",
      refunds: []
    };
    shopRequest.mockImplementation(async (path) => {
      if (path === "/admin/orders") return { orders: [order] };
      if (path === "/admin/delivery-areas") return { areas: [] };
      return {};
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderShopAdmin();
    await screen.findByText("MS-ORDER-2");
    fireEvent.change(screen.getByLabelText("Payment to refund"), { target: { value: "delivery_fee_manual" } });
    fireEvent.change(screen.getByLabelText("Refund amount (NGN)"), { target: { value: "1200" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Delivery cancelled" } });
    fireEvent.change(screen.getByLabelText("External refund reference"), { target: { value: "BANK-TRANSFER-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Record completed external refund" }));

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/orders/order-manual-delivery/refunds", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          source: "delivery_fee_manual",
          amount: 1200,
          reason: "Delivery cancelled",
          externalReference: "BANK-TRANSFER-123"
        })
      }));
    });
  });

  it("shows direct business contact links and lets admins retry a failed receipt email", async () => {
    let order = {
      _id: "order-email",
      orderNumber: "MS-EMAIL-1",
      customerSnapshot: { name: "Shopper", email: "shopper@example.com", phone: "08000000000" },
      createdAt: "2026-10-08T12:00:00.000Z",
      status: "received",
      paymentStatus: "paid",
      subtotal: 5000,
      deliveryFee: 0,
      deliveryFeePaymentStatus: "not_set",
      totalPaid: 5000,
      totalRefunded: 0,
      receiptEmailStatus: "failed",
      receiptEmailError: "Email service is unavailable.",
      deliveryEmailStatus: "not_sent",
      items: [{ productName: "Gift set", quantity: 1, supplierName: "Market Goods", supplierPhone: "08012345678" }],
      deliveryAddress: {
        recipientName: "Shopper",
        phone: "08000000000",
        addressLine: "1 Market Road",
        city: "Ikeja",
        state: "Lagos",
        deliveryNote: ""
      },
      adminNote: "",
      refunds: []
    };
    shopRequest.mockImplementation(async (path) => {
      if (path === "/admin/orders") return { orders: [order] };
      if (path === "/admin/delivery-areas") return { areas: [] };
      if (path === "/admin/orders/order-email/emails/receipt/retry") {
        order = { ...order, receiptEmailStatus: "sent", receiptEmailError: "" };
        return { message: "Receipt email sent to the customer." };
      }
      if (path === "/admin/orders/order-email") {
        order = { ...order, ...JSON.parse(options.body || "{}") };
        return { order };
      }
      return {};
    });

    renderShopAdmin();
    await screen.findByText("MS-EMAIL-1");

    expect(screen.getByRole("link", { name: "WhatsApp Market Goods" }).getAttribute("href")).toContain("wa.me/2348012345678");
    expect(screen.getByRole("link", { name: "Call business" }).getAttribute("href")).toBe("tel:+2348012345678");
    expect(screen.getByText("Email service is unavailable.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry receipt email" }));

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/orders/order-email/emails/receipt/retry", expect.objectContaining({
        method: "POST"
      }));
    });
    expect(await screen.findByText("Receipt email sent to the customer.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Order status/), { target: { value: "delivered" } });
    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/admin/orders/order-email", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "delivered" })
      }));
    });
  });
});
