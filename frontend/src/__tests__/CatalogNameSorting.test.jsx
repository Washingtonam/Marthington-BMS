// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "../api/client.js";
import { getServices } from "../api/services.js";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: { role: "owner" },
    business: {},
    isPro: true
  })
}));

vi.mock("../api/client.js", () => ({
  default: vi.fn(async (path) => {
    const sort = new URL(path, "http://localhost").searchParams.get("sort");
    const products = [
      { _id: "p1", name: "Zebra", category: "Equipment", sellingPrice: 25, stock: 10 },
      { _id: "p2", name: "Apple", category: "Equipment", sellingPrice: 10, stock: 8 }
    ];

    if (sort) {
      products.sort((a, b) =>
        (sort === "name-desc" ? -1 : 1) * a.name.localeCompare(b.name)
      );
    }

    return {
      products,
      pagination: { currentPage: 1, totalPages: 1, totalProducts: products.length }
    };
  })
}));

vi.mock("../api/services.js", () => ({
  createService: vi.fn(),
  deleteService: vi.fn(),
  getServices: vi.fn(async () => [
    { _id: "s1", name: "Zebra", category: "Care", price: 25 },
    { _id: "s2", name: "Apple", category: "Care", price: 10 }
  ]),
  toggleServiceStatus: vi.fn(),
  updateService: vi.fn()
}));

import Products from "../pages/Products.jsx";
import Services from "../pages/Services.jsx";

describe("catalog name sorting", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    request.mockClear();
    getServices.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("requests product pages sorted by name without changing the default order", async () => {
    const { container } = render(<Products />);

    const productNames = () =>
      [...container.querySelectorAll("tbody tr td:nth-child(2) .font-semibold")]
        .map((element) => element.textContent);

    await waitFor(() => expect(productNames()).toEqual(["Zebra", "Apple"]));

    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "name-asc" }
    });

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(expect.stringContaining("sort=name-asc"));
      expect(productNames()).toEqual(["Apple", "Zebra"]);
    });
  });

  it("sorts services by name while preserving their default order", async () => {
    const { container } = render(<Services />);

    const serviceNames = () =>
      [...container.querySelectorAll(".product-row:not(.product-row-head) .service-name-cell strong")]
        .map((element) => element.textContent);

    await waitFor(() => expect(serviceNames()).toEqual(["Zebra", "Apple"]));

    fireEvent.change(screen.getByRole("combobox", { name: "Sort services" }), {
      target: { value: "name-asc" }
    });
    expect(serviceNames()).toEqual(["Apple", "Zebra"]);

    fireEvent.change(screen.getByRole("combobox", { name: "Sort services" }), {
      target: { value: "added" }
    });
    expect(serviceNames()).toEqual(["Zebra", "Apple"]);
  });
});
