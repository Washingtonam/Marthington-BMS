// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ShopAccount from "../pages/ShopAccount.jsx";
import { shopRequest } from "../api/shop.js";

vi.mock("../api/shop.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, shopRequest: vi.fn(), saveShopSession: vi.fn() };
});

describe("Shopper account registration", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("submits the shopper's WhatsApp number and structured Nigerian delivery address", async () => {
    shopRequest.mockResolvedValue({ token: "shop-token", customer: { name: "Ada" } });
    render(<MemoryRouter><ShopAccount /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Okafor" } });
    fireEvent.change(screen.getByLabelText(/WhatsApp phone number/), { target: { value: "08012345678" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "correct-horse-battery" } });
    fireEvent.change(screen.getByLabelText("Street address"), { target: { value: "12 Broad Street" } });
    fireEvent.change(screen.getByLabelText("State / province / region"), { target: { value: "Lagos" } });
    fireEvent.change(screen.getByLabelText("Local government area (LGA)"), { target: { value: "Ikeja" } });
    fireEvent.change(screen.getByLabelText("City / town / area"), { target: { value: "Ikeja" } });
    fireEvent.change(screen.getByLabelText("Nearest bus stop or landmark (optional)"), { target: { value: "Computer Village" } });

    fireEvent.click(screen.getAllByRole("button", { name: "Create account", exact: true })[1]);

    await waitFor(() => {
      expect(shopRequest).toHaveBeenCalledWith("/customers/register", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ada Okafor",
          email: "ada@example.com",
          phone: "08012345678",
          password: "correct-horse-battery",
          deliveryAddress: {
            addressLine: "12 Broad Street",
            countryCode: "NG",
            state: "Lagos",
            localGovernment: "Ikeja",
            city: "Ikeja",
            nearestBusStop: "Computer Village",
            deliveryNote: "",
            label: "Home",
            recipientName: "Ada Okafor",
            phone: "08012345678"
          }
        })
      }));
    });
  });
});
