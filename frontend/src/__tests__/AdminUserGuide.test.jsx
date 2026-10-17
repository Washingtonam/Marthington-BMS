import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminUserGuide from "../pages/AdminUserGuide.jsx";

const mockGetUserGuide = vi.fn();
const mockSaveUserGuide = vi.fn();

vi.mock("../api/userGuide.js", () => ({
  getUserGuide: (...args) => mockGetUserGuide(...args),
  saveUserGuide: (...args) => mockSaveUserGuide(...args)
}));

describe("Admin user guide editor", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockGetUserGuide.mockReset().mockResolvedValue({ guide: null, updatedAt: null });
    mockSaveUserGuide.mockReset().mockImplementation(async (guide) => ({
      guide,
      updatedAt: "2026-10-17T00:00:00.000Z"
    }));
    window.confirm = vi.fn(() => true);
  });

  it("loads defaults, edits content, and publishes changes", async () => {
    render(<MemoryRouter><AdminUserGuide /></MemoryRouter>);

    const title = await screen.findByLabelText("Page title");
    fireEvent.change(title, { target: { value: "Updated help center" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and publish" }));

    await waitFor(() => {
      expect(mockSaveUserGuide).toHaveBeenCalledWith(expect.objectContaining({
        title: "Updated help center",
        workflows: expect.any(Array),
        directory: expect.any(Array),
        checklist: expect.any(Array),
        quickFlow: expect.any(Array),
        faqs: expect.any(Array)
      }));
    });
    expect((await screen.findByRole("status")).textContent).toContain("Guide changes are saved");
  });

  it("reports malformed JSON without sending a save request", async () => {
    render(<MemoryRouter><AdminUserGuide /></MemoryRouter>);

    const workflows = await screen.findByLabelText("Workflow guides");
    fireEvent.change(workflows, { target: { value: "not valid JSON" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and publish" }));

    expect((await screen.findByRole("alert")).textContent).toContain("JSON");
    expect(mockSaveUserGuide).not.toHaveBeenCalled();
  });
});
