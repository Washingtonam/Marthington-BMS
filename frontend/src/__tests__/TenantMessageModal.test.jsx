import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TenantMessageModal from "../components/TenantMessageModal.jsx";

afterEach(cleanup);

const recipients = [
  { _id: "business-1", businessId: "business-1", name: "Northwind", ownerName: "Ada", ownerEmail: "ada@example.com" },
  { _id: "business-2", businessId: "business-2", name: "Southridge", ownerName: "Lee", ownerEmail: "lee@example.com" }
];

describe("Tenant message modal", () => {
  it("sends only selected businesses from the central composer", async () => {
    const onSendDirect = vi.fn().mockResolvedValue({ sent: 1 });
    render(
      <TenantMessageModal
        recipients={recipients}
        allowRecipientSelection
        onSendDirect={onSendDirect}
        onClose={vi.fn()}
      />
    );

    const sendButton = screen.getByRole("button", { name: "Send directly via Email (0)" });
    expect(sendButton.disabled).toBe(true);

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Send directly via Email (1)" }));

    await waitFor(() => {
      expect(onSendDirect).toHaveBeenCalledWith(expect.objectContaining({
        recipients: [recipients[0]],
        channel: "email"
      }));
    });
  });

  it("saves the reusable message settings", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue({
      _id: "draft-1",
      name: "Shop feature follow-up",
      channel: "email",
      subject: "New shop feature",
      message: "Hello"
    });
    render(
      <TenantMessageModal
        recipients={[recipients[0]]}
        onSaveDraft={onSaveDraft}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. New shop feature follow-up"), {
      target: { value: "Shop feature follow-up" }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "Hello, check out our new shop feature." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save message" }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({
        name: "Shop feature follow-up",
        channel: "email",
        message: "Hello, check out our new shop feature."
      }));
    });
    expect((await screen.findByRole("status")).textContent).toContain("Saved.");
  });

  it("sends through the selected channel preference and requires WhatsApp opt-in when it resolves to WhatsApp", async () => {
    const recipient = {
      _id: "business-3",
      businessId: "business-3",
      name: "Eastside",
      ownerName: "Sam",
      ownerPhone: "08012345678"
    };
    const onSendDirect = vi.fn().mockResolvedValue({ sent: 1 });
    render(
      <TenantMessageModal
        recipients={[recipient]}
        allowRecipientSelection
        onSendDirect={onSendDirect}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp first" }));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    const sendButton = screen.getByRole("button", { name: "Send directly via WhatsApp first (1)" });
    expect(sendButton.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/I confirm every selected recipient/));
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSendDirect).toHaveBeenCalledWith(expect.objectContaining({
        recipients: [recipient],
        channel: "whatsapp-first",
        whatsappOptInConfirmed: true
      }));
    });
  });

  it("offers the fallback channel when opening drafts for selected businesses", () => {
    const recipient = {
      _id: "business-4",
      businessId: "business-4",
      name: "Westside",
      ownerName: "Jo",
      ownerPhone: "08012345678"
    };
    render(
      <TenantMessageModal
        recipients={[recipient]}
        allowRecipientSelection
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Email first" }));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expect(screen.getByRole("link", { name: "Open WhatsApp draft" })).toBeTruthy();
    expect(screen.getByText(/Email: — · Phone: 08012345678/)).toBeTruthy();
  });

  it("saves channel preference with the reusable message", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue({
      _id: "draft-2",
      name: "WhatsApp-first follow-up",
      channel: "whatsapp-first",
      subject: "Important update",
      message: "Hello"
    });
    render(
      <TenantMessageModal
        recipients={[recipients[0]]}
        onSaveDraft={onSaveDraft}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp first" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. New shop feature follow-up"), {
      target: { value: "WhatsApp-first follow-up" }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email subject" }), {
      target: { value: "Important update" }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "Hello" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save message" }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({
        name: "WhatsApp-first follow-up",
        channel: "whatsapp-first",
        subject: "Important update",
        message: "Hello"
      }));
    });
  });
});
