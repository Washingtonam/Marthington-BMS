// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import AutocompleteSearch from "../components/AutocompleteSearch.jsx";

afterEach(cleanup);

describe("AutocompleteSearch", () => {
  it("shows matching suggestions and selects one", () => {
    const onChange = vi.fn();
    render(
      <AutocompleteSearch
        id="catalog-search"
        value="lap"
        onChange={onChange}
        suggestions={["Laptop", "Desk"]}
        placeholder="Search catalog"
      />
    );
    fireEvent.focus(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Laptop" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Desk" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Laptop" }));

    expect(onChange).toHaveBeenCalledWith("Laptop");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("supports choosing a suggestion with the keyboard", () => {
    const onChange = vi.fn();
    render(
      <AutocompleteSearch
        id="catalog-search"
        value="ca"
        onChange={onChange}
        suggestions={["Camera", "Cable"]}
        placeholder="Search catalog"
      />
    );
    const input = screen.getByRole("combobox");

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Camera");
  });
});
