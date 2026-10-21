import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ShopProfile from "../pages/ShopProfile.jsx";

const mockShopRequest = vi.fn();

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: (...args) => mockShopRequest(...args) };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  mockShopRequest.mockReset();
});

describe("Shopper profile and settings", () => {
  it("loads profile details and submits editable contact and password fields", async () => {
    localStorage.setItem("marthington_shop_token", "customer-token");
    localStorage.setItem("marthington_shop_customer", JSON.stringify({ id: "customer-1" }));
    mockShopRequest.mockImplementation((path) => {
      if (path === "/customers/me") {
        return Promise.resolve({ customer: { id: "customer-1", name: "Ada", email: "ada@example.com", phone: "08012345678", addresses: [] } });
      }
      return Promise.resolve({ customer: { id: "customer-1", name: "Ada Okafor", email: "ada@example.com", phone: "08012345678", addresses: [] } });
    });

    render(<MemoryRouter><ShopProfile /></MemoryRouter>);

    expect(await screen.findByDisplayValue("Ada")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Okafor" } });
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(mockShopRequest).toHaveBeenCalledWith("/customers/me", expect.objectContaining({ method: "PATCH", body: expect.any(FormData) }));
    });
    expect(await screen.findByRole("status")).toBeTruthy();
  });
});
