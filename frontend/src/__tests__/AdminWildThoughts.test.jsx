// @vitest-environment jsdom

import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminWildThoughts from "../pages/AdminWildThoughts.jsx";
import request from "../api/client.js";

vi.mock("../api/client.js", () => ({ default: vi.fn() }));

const originalSpeechRecognition = window.SpeechRecognition;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  if (originalSpeechRecognition === undefined) delete window.SpeechRecognition;
  else window.SpeechRecognition = originalSpeechRecognition;
});

describe("Wild Thoughts", () => {
  it("dictates text into the form and suggests a title and category", async () => {
    let recognition;
    window.SpeechRecognition = class {
      constructor() {
        recognition = this;
      }
      start() {}
      stop() {}
    };
    request.mockResolvedValueOnce({ thoughts: [], total: 0 });
    render(<MemoryRouter><AdminWildThoughts /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Dictate thought" }));
    act(() => {
      recognition.onresult({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "Launch a marketing campaign for local shops" } }]
      });
    });

    expect(screen.getByLabelText("Thought").value).toBe("Launch a marketing campaign for local shops");
    expect(screen.getByLabelText("Idea title").value).toBe("Launch a marketing campaign for local shops");
    expect(screen.getAllByLabelText("Category")[0].value).toBe("marketing");
    expect(screen.getByRole("status").textContent).toMatch(/no venture was guessed/);
  });

  it("routes a dictated thought only when it explicitly names a saved venture", async () => {
    let recognition;
    window.SpeechRecognition = class {
      constructor() {
        recognition = this;
      }
      start() {}
      stop() {}
    };
    request.mockResolvedValueOnce({
      total: 1,
      thoughts: [{
        _id: "thought-existing",
        title: "First idea",
        thought: "Existing business thought",
        venture: "Marthington BMS",
        category: "product",
        priority: "medium",
        status: "captured",
        nextAction: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]
    });
    render(<MemoryRouter><AdminWildThoughts /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Dictate thought" }));
    act(() => {
      recognition.onresult({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "For Marthington BMS, create a marketing campaign" } }]
      });
    });

    expect(screen.getByLabelText("Business / venture").value).toBe("Marthington BMS");
    expect(screen.getByRole("status").textContent).toMatch(/Matched “Marthington BMS”/);
  });

  it("creates and updates ideas assigned to a venture", async () => {
    window.scrollTo = vi.fn();
    request.mockResolvedValueOnce({ thoughts: [], total: 0 });
    render(<MemoryRouter><AdminWildThoughts /></MemoryRouter>);

    fireEvent.change(await screen.findByLabelText("Idea title"), { target: { value: "Hardware shop demo" } });
    fireEvent.change(screen.getByLabelText("Thought"), { target: { value: "Show stock tracking and online catalog." } });
    fireEvent.change(screen.getByLabelText("Business / venture"), { target: { value: "Marthington BMS" } });
    request.mockResolvedValueOnce({
      thought: {
        _id: "thought-1",
        title: "Hardware shop demo",
        thought: "Show stock tracking and online catalog.",
        venture: "Marthington BMS",
        category: "marketing",
        priority: "medium",
        status: "captured",
        nextAction: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    fireEvent.change(screen.getAllByLabelText("Category")[0], { target: { value: "marketing" } });
    fireEvent.click(screen.getByRole("button", { name: "Save wild thought" }));

    expect(await screen.findByText("Wild thought saved.")).toBeTruthy();
    expect(screen.getByText("Hardware shop demo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit Hardware shop demo" }));
    fireEvent.change(screen.getByLabelText("Idea title"), { target: { value: "Updated hardware demo" } });
    request.mockResolvedValueOnce({
      thought: {
        _id: "thought-1",
        title: "Updated hardware demo",
        thought: "Show stock tracking and online catalog.",
        venture: "Marthington BMS",
        category: "marketing",
        priority: "medium",
        status: "captured",
        nextAction: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Update thought" }));
    await waitFor(() => expect(screen.getByText("Updated hardware demo")).toBeTruthy());
    expect(request).toHaveBeenCalledWith("/admin/wild-thoughts/thought-1", expect.objectContaining({ method: "PATCH" }));
  });
});
