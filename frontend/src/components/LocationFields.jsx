import React, { useMemo } from "react";
import { allCountries } from "country-region-data";
import nigeriaLocationData from "nigeria-state-lga-data";

const nigeriaStates = nigeriaLocationData.getStatesData()
  .map((state) => ({ name: state.name, lgas: state.lgas }))
  .sort((a, b) => a.name.localeCompare(b.name));
const countries = allCountries
  .map(([name, code]) => ({ name, code }))
  .sort((a, b) => a.name.localeCompare(b.name));

const LocationFields = ({
  value,
  onChange,
  idPrefix = "location",
  inputClassName = "rounded-xl border border-slate-300 px-4 py-3 font-normal",
  labelClassName = "grid gap-1 text-sm font-semibold",
  includeNearestBusStop = true
}) => {
  const states = useMemo(() => {
    if (value.countryCode === "NG") return nigeriaStates;
    return (allCountries.find(([, code]) => code === value.countryCode)?.[2] || [])
      .map(([name]) => ({ name, lgas: [] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [value.countryCode]);
  const selectedState = states.find((item) => item.name === value.state);
  const hasStateOptions = states.length > 0;
  const isNigeria = value.countryCode === "NG";

  const change = (updates) => onChange({ ...value, ...updates });
  const selectClassName = `bg-white ${inputClassName}`;

  return (
    <>
      <label className={labelClassName}>
        Country
        <select
          required
          autoComplete="country-name"
          value={value.countryCode || "NG"}
          onChange={(event) => change({ countryCode: event.target.value, state: "", localGovernment: "" })}
          className={selectClassName}
        >
          <option value="">Select country</option>
          {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>
      <label className={labelClassName}>
        State / province / region
        {hasStateOptions ? (
          <select
            required
            autoComplete="address-level1"
            value={value.state}
            onChange={(event) => change({ state: event.target.value, localGovernment: "" })}
            className={selectClassName}
          >
            <option value="">Select state / province</option>
            {states.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        ) : (
          <input
            required
            autoComplete="address-level1"
            value={value.state}
            onChange={(event) => change({ state: event.target.value })}
            className={inputClassName}
            placeholder="Enter state, province, or region"
          />
        )}
      </label>
      {isNigeria && (
        <label className={labelClassName}>
          Local government area (LGA)
          <select
            required
            autoComplete="address-level2"
            disabled={!selectedState}
            value={value.localGovernment}
            onChange={(event) => change({ localGovernment: event.target.value })}
            className={selectClassName}
          >
            <option value="">{selectedState ? "Select local government area" : "Select a state first"}</option>
            {(selectedState?.lgas || []).slice().sort((a, b) => a.localeCompare(b)).map((lga) => (
              <option key={lga} value={lga}>{lga}</option>
            ))}
          </select>
        </label>
      )}
      <label className={labelClassName}>
        City / town / area
        <input
          required
          autoComplete="address-level2"
          value={value.city}
          onChange={(event) => change({ city: event.target.value })}
          className={inputClassName}
          placeholder="Enter city or town"
        />
      </label>
      {includeNearestBusStop && (
        <label className={labelClassName}>
          Nearest bus stop or landmark (optional)
          <input
            value={value.nearestBusStop}
            onChange={(event) => change({ nearestBusStop: event.target.value })}
            className={inputClassName}
            placeholder="Help the delivery team find you"
          />
        </label>
      )}
    </>
  );
};

export default LocationFields;
