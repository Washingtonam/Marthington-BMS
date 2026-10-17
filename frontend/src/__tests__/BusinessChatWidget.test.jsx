import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BusinessChatWidget from "../components/BusinessChatWidget.jsx";

const mockRequest = vi.fn();

vi.mock("../api/client.js", () => ({
  default: (...args) => mockRequest(...args)
}));

describe("BusinessChatWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockRequest.mockImplementation((path, options = {}) => {
      if (path === "/support-chat/access") return Promise.resolve({ enabled: true });
      if (path === "/support-chat/threads/assistant") return Promise.resolve({ conversation: null });
      if (path === "/support-chat/threads/support") return Promise.resolve({ conversation: null });
      if (path === "/support-chat/threads/assistant/messages") {
        return Promise.resolve({
          conversation: {
            messages: [
              { _id: "question", senderRole: "user", body: JSON.parse(options.body).body, createdAt: new Date().toISOString() },
              { _id: "answer", senderRole: "assistant", senderName: "Business assistant", body: "The requested business answer.", createdAt: new Date().toISOString() }
            ]
          }
        });
      }
      return Promise.resolve({});
    });
  });

  it("supports both modes and sends assistant questions", async () => {
    render(<BusinessChatWidget />);

    fireEvent.click(await screen.findByRole("button", { name: "Open business chat" }));
    expect(await screen.findByRole("tab", { name: "Business assistant" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Chat message" }), { target: { value: "How much stock is available?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("The requested business answer.")).toBeTruthy();
    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(
      "/support-chat/threads/assistant/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "How much stock is available?" })
      })
    ));

    fireEvent.click(screen.getByRole("tab", { name: "Chat with support" }));
    expect(await screen.findByText(/Your message will be visible to the superadmin support team/)).toBeTruthy();
    expect(mockRequest).toHaveBeenCalledWith("/support-chat/threads/support");
  });
});
