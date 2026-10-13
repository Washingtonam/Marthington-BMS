import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SubscriptionEmailComposer from "../components/SubscriptionEmailComposer.jsx";

const mockRequest = vi.fn();

vi.mock("../api/client.js", () => ({
  default: (...args) => mockRequest(...args)
}));

afterEach(cleanup);

describe("Subscription email composer", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockImplementation((path, options = {}) => {
      if (path === "/admin/subscriptions/email-drafts" && options.method === "PUT") {
        return Promise.resolve({ draft: { _id: "draft-1" } });
      }
      if (path === "/admin/subscriptions/email-drafts") return Promise.resolve({ drafts: [] });
      if (path.startsWith("/admin/subscriptions/email-audience")) return Promise.resolve({ count: 1 });
      if (path === "/admin/subscriptions/email-drafts/draft-1/send") {
        return Promise.resolve({ campaignId: "campaign-1", recipientCount: 1 });
      }
      if (path === "/admin/subscriptions/email-campaigns/campaign-1") {
        return Promise.resolve({
          campaign: { status: "sent", deliveredCount: 1, failedCount: 0 }
        });
      }
      return Promise.resolve({});
    });
    window.confirm = vi.fn(() => true);
  });

  it("previews business placeholders and saves an audience-specific email draft", async () => {
    mockRequest.mockImplementation((path, options = {}) => {
      if (path === "/admin/subscriptions/email-drafts" && options.method === "PUT") {
        return Promise.resolve({ draft: { _id: "draft-1" } });
      }
      if (path === "/admin/subscriptions/email-drafts") return Promise.resolve({ drafts: [] });
      if (path.startsWith("/admin/subscriptions/email-audience")) return Promise.resolve({ count: 2 });
      return Promise.resolve({});
    });

    render(
      <SubscriptionEmailComposer
        initialAudience="subscription_expiring_7"
        subscriptions={[{
          name: "Northwind Academy",
          ownerName: "Ada Owner",
          subscription: { plan: "pro", status: "active", tier: "Premium" }
        }]}
      />
    );

    expect(await screen.findByText((_, element) => element.tagName === "P" && element.textContent.includes("Recipients with email: 2"))).toBeTruthy();
    expect(screen.getByText(/Renew Northwind Academy’s Pro subscription/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/admin/subscriptions/email-drafts",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"audienceType":"subscription_expiring_7"')
        })
      );
    });
  });

  it("requires a saved draft before sending and reports completed delivery", async () => {
    mockRequest.mockImplementation((path, options = {}) => {
      if (path === "/admin/subscriptions/email-drafts" && options.method === "PUT") {
        return Promise.resolve({ draft: { _id: "draft-1" } });
      }
      if (path === "/admin/subscriptions/email-drafts") {
        return Promise.resolve({ drafts: [] });
      }
      if (path.startsWith("/admin/subscriptions/email-audience")) return Promise.resolve({ count: 1 });
      if (path === "/admin/subscriptions/email-drafts/draft-1/send") {
        return Promise.resolve({ campaignId: "campaign-1", recipientCount: 1 });
      }
      if (path === "/admin/subscriptions/email-campaigns/campaign-1") {
        return Promise.resolve({ campaign: { status: "sent", deliveredCount: 1, failedCount: 0 } });
      }
      return Promise.resolve({});
    });

    render(<SubscriptionEmailComposer initialAudience="subscription_active_pro" />);
    expect(await screen.findByText((_, element) => element.tagName === "P" && element.textContent.includes("Recipients with email: 1"))).toBeTruthy();

    const sendButton = screen.getByRole("button", { name: "Send reminder" });
    expect(sendButton.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Send reminder" }).disabled).toBe(false));

    fireEvent.click(screen.getByRole("button", { name: "Send reminder" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/admin/subscriptions/email-drafts/draft-1/send",
        { method: "POST" }
      );
    });
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("Email delivered to 1 recipient(s).");
    });
  });
});
