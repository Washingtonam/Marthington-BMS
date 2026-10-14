import test from "node:test";
import assert from "node:assert/strict";
import { validateAndNormalizeLocation } from "../src/utils/locationData.js";

test("location validation normalizes Nigeria state and LGA selections", () => {
  assert.deepEqual(
    validateAndNormalizeLocation({
      countryCode: "ng",
      state: "lagos",
      localGovernment: "ikeja"
    }),
    {
      country: "Nigeria",
      countryCode: "NG",
      state: "Lagos",
      localGovernment: "Ikeja"
    }
  );
});

test("location validation rejects an LGA that does not belong to the selected state", () => {
  assert.equal(
    validateAndNormalizeLocation({
      countryCode: "NG",
      state: "Lagos",
      localGovernment: "Kano Municipal"
    }).error,
    "Select a valid local government area for the selected state."
  );
});

test("location validation accepts a selected region for another country", () => {
  assert.deepEqual(
    validateAndNormalizeLocation({ countryCode: "CA", state: "Ontario" }),
    { country: "Canada", countryCode: "CA", state: "Ontario", localGovernment: "" }
  );
});

test("location validation rejects unknown country and region values", () => {
  assert.equal(validateAndNormalizeLocation({ countryCode: "XX", state: "Anywhere" }).error, "Select a valid country.");
  assert.equal(validateAndNormalizeLocation({ countryCode: "CA", state: "Lagos" }).error, "Select a valid state, province, or region for the selected country.");
});
