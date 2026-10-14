// @vitest-environment jsdom

import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LocationFields from "../components/LocationFields.jsx";

const TestLocationFields = () => {
  const [value, setValue] = useState({
    countryCode: "NG",
    state: "",
    localGovernment: "",
    city: "",
    nearestBusStop: ""
  });
  return <LocationFields value={value} onChange={setValue} />;
};

describe("LocationFields", () => {
  afterEach(cleanup);

  it("filters Nigerian LGAs by the selected state and clears them when state changes", () => {
    render(<TestLocationFields />);

    const state = screen.getByLabelText("State / province / region");
    fireEvent.change(state, { target: { value: "Lagos" } });
    const lga = screen.getByLabelText("Local government area (LGA)");
    expect(lga.querySelector('option[value="Ikeja"]')).toBeTruthy();
    expect(lga.querySelector('option[value="Kano Municipal"]')).toBeNull();
    fireEvent.change(lga, { target: { value: "Ikeja" } });

    fireEvent.change(state, { target: { value: "Ogun" } });
    expect(lga.value).toBe("");
    expect(lga.querySelector('option[value="Abeokuta South"]')).toBeTruthy();
    expect(lga.querySelector('option[value="Ikeja"]')).toBeNull();
  });

  it("shows only the selected country's regions and does not request LGAs outside Nigeria", () => {
    render(<TestLocationFields />);

    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "CA" } });
    const state = screen.getByLabelText("State / province / region");
    expect(state.querySelector('option[value="Ontario"]')).toBeTruthy();
    expect(screen.queryByLabelText("Local government area (LGA)")).toBeNull();
  });
});
