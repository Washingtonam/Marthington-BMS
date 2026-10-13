// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PlanUpgradeNotice, { isPlanAccessMessage } from "../components/PlanUpgradeNotice.jsx";

describe("plan upgrade notice", () => {
  it("identifies plan limit and feature access errors", () => {
    expect(isPlanAccessMessage("Product limit reached for your plan.")).toBe(true);
    expect(isPlanAccessMessage("Logo upload is not available on your current plan.")).toBe(true);
    expect(isPlanAccessMessage("You do not have permission to update this record.")).toBe(false);
  });

  it("offers a non-blocking path to billing and can be dismissed", () => {
    const onDismiss = vi.fn();
    render(
      <MemoryRouter>
        <PlanUpgradeNotice message="Staff limit reached." onDismiss={onDismiss} />
      </MemoryRouter>
    );

    expect(screen.getByText("You’re using Free mode")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View Pro options" }).getAttribute("href")).toBe("/app/billing");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
