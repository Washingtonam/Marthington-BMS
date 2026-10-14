import { allCountries } from "country-region-data";
import nigeriaLocationData from "nigeria-state-lga-data";

const countryByCode = new Map(allCountries.map(([name, code, regions]) => [
  code,
  { name, regions: regions.map(([regionName]) => regionName) }
]));

const nigeriaStates = nigeriaLocationData.getStatesData();

export const validateAndNormalizeLocation = (location = {}) => {
  const countryCode = String(location.countryCode || "").trim().toUpperCase();
  const country = countryByCode.get(countryCode);
  if (!country) return { error: "Select a valid country." };

  const stateInput = String(location.state || "").trim();
  let state = stateInput;
  let localGovernment = "";

  if (countryCode === "NG") {
    const selectedState = nigeriaStates.find((item) => item.name.toLowerCase() === stateInput.toLowerCase());
    if (!selectedState) return { error: "Select a valid Nigerian state." };
    state = selectedState.name;
    const lgaInput = String(location.localGovernment || "").trim();
    const selectedLga = selectedState.lgas.find((item) => item.toLowerCase() === lgaInput.toLowerCase());
    if (!selectedLga) return { error: "Select a valid local government area for the selected state." };
    localGovernment = selectedLga;
  } else if (country.regions.length) {
    const selectedRegion = country.regions.find((item) => item.toLowerCase() === stateInput.toLowerCase());
    if (!selectedRegion) return { error: "Select a valid state, province, or region for the selected country." };
    state = selectedRegion;
  } else if (!stateInput || stateInput.length > 100) {
    return { error: "Enter a valid state, province, or region." };
  }

  return {
    country: country.name,
    countryCode,
    state,
    localGovernment
  };
};
