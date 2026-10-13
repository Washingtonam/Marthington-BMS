import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminTenantDirectory from "../pages/AdminTenantDirectory.jsx";

const mockRequest = vi.fn();
const mockNavigate = vi.fn();
const mockStartAccess = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../api/client.js", () => ({
  default: (...args) => mockRequest(...args),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    startImpersonation: mockStartAccess,
  }),
}));

describe("Admin tenant directory", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockRequest.mockReset();
    mockNavigate.mockReset();
    mockStartAccess.mockReset();
    window.confirm = vi.fn(() => true);

    mockRequest.mockImplementation((path, options = {}) => {
      if (path === "/admin/overview") {
        return Promise.resolve({
          businesses: [
            {
              _id: "biz1",
              name: "Test Academy",
              ownerEmail: "owner@test.com",
              ownerName: "Ada Owner",
              ownerPhone: "+234 801 234 5678",
              whatsappPhone: "+234 801 234 5678",
              industryType: "school",
              subscription: { plan: "free", status: "trial", billingCycle: "monthly", expiresAt: "2026-10-20T00:00:00.000Z" },
              totalSalesRecord: 123,
              studentCount: 44,
            },
          ],
        });
      }

      if (path === "/admin/business/biz1?permanent=true") {
        return Promise.resolve({ message: "Business permanently deleted" });
      }

      return Promise.resolve({});
    });
  });

  it("shows the Businesses tab and permanently deletes a business after confirmation", async () => {
    render(
      <MemoryRouter>
        <AdminTenantDirectory />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: "Businesses" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringMatching(/permanently delete.*Test Academy/i)
      );
      expect(mockRequest).toHaveBeenCalledWith(
        "/admin/business/biz1?permanent=true",
        expect.objectContaining({
          method: "DELETE",
          body: expect.stringContaining('"reason":"Admin permanent deletion"')
        })
      );
    });
  });

  it("accesses a business account from the directory", async () => {
    render(
      <MemoryRouter>
        <AdminTenantDirectory />
      </MemoryRouter>
    );

    const accessButton = await screen.findByRole("button", { name: "Access Account" });
    fireEvent.click(accessButton);

    expect(mockStartAccess).toHaveBeenCalledWith("biz1");
    expect(mockNavigate).toHaveBeenCalledWith("/app");
    expect(screen.queryByRole("button", { name: "Impersonate" })).toBeNull();
  });

  it("shows tenant phone details and prepares editable email and WhatsApp drafts", async () => {
    render(
      <MemoryRouter>
        <AdminTenantDirectory />
      </MemoryRouter>
    );

    expect((await screen.findAllByText("+234 801 234 5678")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("trial").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Draft email / WhatsApp" }));

    const emailDraftLink = await screen.findByRole("link", { name: "Open drafted email" });
    expect(decodeURIComponent(emailDraftLink.getAttribute("href"))).toContain("mailto:owner@test.com");
    expect(screen.getByLabelText("Email subject").value).toContain("Test Academy");
    const whatsAppLink = screen.getByRole("link", { name: "Open WhatsApp draft" });
    expect(whatsAppLink.getAttribute("href")).toContain("wa.me/2348012345678");

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Please renew your plan." } });
    expect(decodeURIComponent(screen.getByRole("link", { name: "Open WhatsApp draft" }).getAttribute("href"))).toContain("Please renew your plan.");
  });
});
