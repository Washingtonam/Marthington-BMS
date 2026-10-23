import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminCommunications from "../pages/AdminCommunications.jsx";
import request from "../api/client.js";

vi.mock("../api/client.js", () => ({
  default: vi.fn(async (path) => {
    if (path === "/admin/report-subscriptions") return { subscriptions: [] };
    if (path === "/admin/businesses") {
      return {
        businesses: [{
          _id: "business-1",
          name: "Northwind",
          ownerName: "Ada",
          ownerEmail: "ada@example.com",
          ownerPhone: "08012345678",
          whatsappPhone: "08012345678"
        }]
      };
    }
    if (path === "/admin/communications/messages") return { deliveries: [] };
    if (path === "/admin/communications/drafts") return { drafts: [] };
    if (path === "/admin/email-health") return { verified: true, email: { provider: "resend-api" } };
    if (path.startsWith("/support-chat/admin/threads")) return { conversations: [] };
    return {};
  })
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderCommunicationsRoutes = () => render(
  <MemoryRouter initialEntries={["/admin/communications"]}>
    <Routes>
      <Route path="/admin/communications" element={<AdminCommunications />} />
      <Route path="/admin/communications/compose" element={<AdminCommunications />} />
      <Route path="/admin/communications/chats" element={<AdminCommunications />} />
      <Route path="/admin/communications/messages" element={<AdminCommunications />} />
      <Route path="/admin/communications/recipients" element={<AdminCommunications />} />
    </Routes>
  </MemoryRouter>
);

describe("Admin communications page navigation", () => {
  it("opens the message composer as a page, not a dialog", async () => {
    renderCommunicationsRoutes();
    await screen.findByRole("heading", { name: "Communications" });
    fireEvent.click(screen.getAllByRole("button", { name: /Compose a message/ })[0]);

    expect(await screen.findByRole("heading", { name: "Compose a business message" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Choose businesses to send to/)).toBeTruthy();
  });

  it("opens the chat inbox on its own page", async () => {
    renderCommunicationsRoutes();
    fireEvent.click(await screen.findByRole("button", { name: /Open chat inbox/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "Business chats" })).toBeTruthy();
    expect(screen.getByText(/No business chat messages yet/)).toBeTruthy();
  });

  it("opens report recipients on a separate management page", async () => {
    renderCommunicationsRoutes();
    await screen.findByRole("heading", { name: "Communications" });
    fireEvent.click(screen.getAllByRole("button", { name: /Manage recipients/ })[0]);

    expect(await screen.findByRole("heading", { level: 1, name: "Manage & contact" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Report recipients" })).toBeTruthy();
  });

  it("opens the saved message library on its own page", async () => {
    renderCommunicationsRoutes();
    await screen.findByRole("heading", { name: "Communications" });
    fireEvent.click(screen.getByRole("button", { name: /Open message library/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "Saved messages" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Message library" })).toBeTruthy();
  });

  it("opens the add-recipient form from the recipient-management route", async () => {
    renderCommunicationsRoutes();
    await screen.findByRole("heading", { name: "Communications" });
    fireEvent.click(screen.getAllByRole("button", { name: /Add report recipient/ })[0]);

    expect(await screen.findByRole("heading", { name: "Add report recipient" })).toBeTruthy();
  });
});
