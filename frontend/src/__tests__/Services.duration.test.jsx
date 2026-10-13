import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Services from "../pages/Services.jsx";

const mockCreateService = vi.fn();
const mockGetServices = vi.fn();

vi.mock("../api/services.js", () => ({
  createService: (...args) => mockCreateService(...args),
  deleteService: vi.fn(),
  getServices: (...args) => mockGetServices(...args),
  toggleServiceStatus: vi.fn(),
  updateService: vi.fn()
}));

vi.mock("../utils/spreadsheet.js", () => ({
  downloadSpreadsheet: vi.fn()
}));

describe("Service duration settings", () => {
  beforeEach(() => {
    mockCreateService.mockReset();
    mockGetServices.mockReset();
    mockGetServices.mockResolvedValue([]);
    mockCreateService.mockResolvedValue({});
  });

  it("saves duration units and recurring service frequency", async () => {
    render(<Services />);

    fireEvent.click((await screen.findAllByRole("button", { name: /create service/i }))[0]);
    fireEvent.change(screen.getByPlaceholderText("Enter service name..."), {
      target: { value: "Equipment inspection" }
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Duration amount" }), {
      target: { value: "90" }
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Duration unit" }), {
      target: { value: "minutes" }
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Service frequency" }), {
      target: { value: "twice_yearly" }
    });

    expect(screen.getByText("Equivalent duration: 1 hour 30 minutes")).toBeTruthy();
    fireEvent.submit(screen.getByPlaceholderText("Enter service name...").closest("form"));

    await waitFor(() => {
      expect(mockCreateService).toHaveBeenCalledWith(expect.objectContaining({
        name: "Equipment inspection",
        duration: 90,
        durationUnit: "minutes",
        frequency: "twice_yearly"
      }));
    });
  });
});
