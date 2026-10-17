// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import request from "../api/client.js";

vi.mock("../api/client.js", () => ({ default: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Super admin dashboard Wild Thoughts entry points", () => {
  it("shows a dashboard card and recent-thoughts panel", async () => {
    request.mockImplementation((path) => {
      if (path === "/admin/overview") return Promise.resolve({ stats: {} });
      if (path === "/admin/wild-thoughts?limit=3") {
        return Promise.resolve({
          total: 1,
          thoughts: [{
            _id: "thought-1",
            title: "Improve onboarding",
            thought: "Make first setup easier.",
            venture: "Marthington BMS"
          }]
        });
      }
      return Promise.reject(new Error("Unexpected request"));
    });

    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    expect(await screen.findByRole("link", { name: /Wild Thoughts.*Capture, organize, and update ideas/ })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Wild Thoughts" })).toBeTruthy();
    expect(await screen.findByText("Improve onboarding")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Capture or update a thought" })).toBeTruthy();
  });
});
