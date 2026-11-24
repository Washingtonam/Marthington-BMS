// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";

const onboardingMocks = vi.hoisted(() => ({
  user: { _id: "user-1", onboardingTourVersion: "" },
  saveOnboardingProgress: vi.fn(async (onboardingTours) => ({
    onboardingTourVersion: "v1",
    onboardingTours
  }))
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: onboardingMocks.user,
    saveOnboardingProgress: onboardingMocks.saveOnboardingProgress
  })
}));

import { OnboardingProvider } from "../context/OnboardingContext.jsx";

const TestShell = () => (
  <OnboardingProvider>
    <Outlet />
  </OnboardingProvider>
);

describe("onboarding tour flow", () => {
  beforeEach(() => {
    localStorage.clear();
    onboardingMocks.saveOnboardingProgress.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("moves from the first dashboard walkthrough into the product setup tour", async () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route path="/app" element={<TestShell />}>
            <Route index element={<h1 data-tour="dashboard-quick-stats">Dashboard metrics</h1>} />
            <Route path="products" element={<h1 data-tour="products-add-action">Products</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Step 1 of 4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next: Add a Product" }));

    expect(await screen.findByText("Add a product")).toBeTruthy();
    await waitFor(() => {
      expect(onboardingMocks.saveOnboardingProgress).toHaveBeenCalled();
    });
    const savedProgress = JSON.parse(localStorage.getItem("marthington-onboarding:user-1"));
    expect(savedProgress.version).toBe("v1");
    expect(savedProgress.flowStep).toBe("products");
    expect(savedProgress.completedTours).toContain("dashboard");
  });
});
