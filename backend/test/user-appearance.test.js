import test from "node:test";
import assert from "node:assert/strict";
import User from "../src/modules/users/user.model.js";

test("user appearance stores a validated default accent color", () => {
  const accentColor = User.schema.path("appearance.accentColor");
  assert.equal(accentColor.options.default, "#10b981");
  assert.ok(accentColor.options.match.test("#2563eb"));
  assert.ok(!accentColor.options.match.test("blue"));
});

test("user onboarding progress has a versioned per-user default", () => {
  const onboardingVersion = User.schema.path("onboardingTourVersion");
  assert.equal(onboardingVersion.options.default, "");

  const user = new User({ name: "Test User", email: "onboarding@example.com", password: "password" });
  assert.deepEqual(user.onboardingTours.completedTours, []);
  assert.equal(user.onboardingTours.flowStatus, "not_started");
  assert.equal(user.onboardingTours.flowStep, "dashboard");
  assert.equal(user.onboardingTours.checklistDismissed, false);
});
