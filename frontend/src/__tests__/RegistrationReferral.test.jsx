import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";

const { mockRegister, mockTrackAffiliateClick, mockUseAuth } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockTrackAffiliateClick: vi.fn(),
  mockUseAuth: vi.fn()
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: mockUseAuth
}));

vi.mock("../api/affiliates.js", () => ({
  trackAffiliateClick: mockTrackAffiliateClick
}));

vi.mock("../components/Icon.jsx", () => ({
  default: () => <span aria-hidden="true" />
}));

vi.mock("../components/LocationFields.jsx", () => ({
  default: ({ value, onChange }) => (
    <div>
      <input
        aria-label="Registration state"
        value={value.state}
        onChange={(event) => onChange({ ...value, state: event.target.value })}
      />
      <input
        aria-label="Registration LGA"
        value={value.localGovernment}
        onChange={(event) => onChange({ ...value, localGovernment: event.target.value })}
      />
      <input
        aria-label="Registration city"
        value={value.city}
        onChange={(event) => onChange({ ...value, city: event.target.value })}
      />
    </div>
  )
}));

const completeRequiredFields = () => {
  fireEvent.change(screen.getByLabelText("Owner name"), { target: { value: "Amina Bello" } });
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Bello Stores" } });
  fireEvent.change(screen.getByLabelText("Business street address"), { target: { value: "12 Broad Street" } });
  fireEvent.change(screen.getByLabelText("Registration state"), { target: { value: "Lagos" } });
  fireEvent.change(screen.getByLabelText("Registration LGA"), { target: { value: "Ikeja" } });
  fireEvent.change(screen.getByLabelText("Registration city"), { target: { value: "Ikeja" } });
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "08012345678" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secure-password" } });
};

describe("workspace registration referral code", () => {
  beforeEach(() => {
    localStorage.removeItem("bms_referral");
    mockRegister.mockReset().mockResolvedValue({});
    mockTrackAffiliateClick.mockReset().mockResolvedValue({});
    mockUseAuth.mockReturnValue({ register: mockRegister });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("bms_referral");
  });

  it("allows an organic signup with an explicitly optional empty referral code", async () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
    expect(screen.getByPlaceholderText("Enter an agent code if you have one")).toBeTruthy();
    expect(screen.getByText("Leave this blank if you were not referred by an agent.")).toBeTruthy();
    completeRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
      referralCode: null
    })));
  });

  it("prefills a referral code from the hash-router registration URL", async () => {
    render(
      <MemoryRouter initialEntries={["/register?ref=HASHAGENT"]}>
        <Register />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByPlaceholderText("Enter an agent code if you have one").value).toBe("HASHAGENT"));
    expect(mockTrackAffiliateClick).toHaveBeenCalledWith("HASHAGENT");
  });

  it("submits the entered referral code with the workspace registration payload", async () => {
    render(<MemoryRouter><Register /></MemoryRouter>);

    completeRequiredFields();
    fireEvent.change(screen.getByPlaceholderText("Enter an agent code if you have one"), {
      target: { value: "  CITY2026  " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
      referralCode: "CITY2026",
      name: "Amina Bello",
      businessName: "Bello Stores",
      address: "12 Broad Street",
      addressCountryCode: "NG",
      addressState: "Lagos",
      addressLocalGovernment: "Ikeja",
      addressCity: "Ikeja",
      phone: "08012345678",
      email: "owner@example.com",
      password: "secure-password",
      industryType: "retail"
    })));
  });
});

describe("login route navigation", () => {
  afterEach(cleanup);

  it("provides a route back to the landing page from login", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, login: mockRegister });

    render(<MemoryRouter><Login /></MemoryRouter>);

    expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
  });

  const renderLogin = (role, initialEntry) => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role },
      login: mockRegister
    });

    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<div>Admin workspace</div>} />
          <Route path="/partners/dashboard" element={<div>Agent dashboard</div>} />
          <Route path="/partners/conversions" element={<div>Agent conversions</div>} />
          <Route path="/app" element={<div>Business workspace</div>} />
          <Route path="/app/reports" element={<div>Business reports</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("sends super admins to admin and agents to their requested partner route", () => {
    renderLogin("super_admin", "/login?next=%2Fpartners%2Fconversions");
    expect(screen.getByText("Admin workspace")).toBeTruthy();

    cleanup();
    renderLogin("affiliate", "/login?next=%2Fpartners%2Fconversions");
    expect(screen.getByText("Agent conversions")).toBeTruthy();
  });

  it("keeps business users in the app and rejects routes for other roles", () => {
    renderLogin("owner", "/login?next=%2Fadmin");
    expect(screen.getByText("Business workspace")).toBeTruthy();

    cleanup();
    renderLogin("owner", "/login?next=%2Fapp%2Freports");
    expect(screen.getByText("Business reports")).toBeTruthy();
  });
});
