import test from "node:test";
import assert from "node:assert/strict";
import User from "../src/modules/users/user.model.js";
import authController from "../src/modules/auth/auth.controller.js";

const responseMock = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test("onboarding progress rejects unknown tour keys without writing", async () => {
  const original = User.findByIdAndUpdate;
  let called = false;
  User.findByIdAndUpdate = () => {
    called = true;
    throw new Error("Unexpected user write");
  };

  try {
    const response = responseMock();
    await authController.updateOnboardingProgress({
      user: { id: "user-1" },
      body: {
        onboardingTourVersion: "v1",
        onboardingTours: {
          completedTours: ["unknown-tour"],
          flowStatus: "not_started",
          flowStep: "dashboard",
          checklistDismissed: false
        }
      }
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(called, false);
  } finally {
    User.findByIdAndUpdate = original;
  }
});

test("onboarding progress saves only supported fields and deduplicates completed tours", async () => {
  const original = User.findByIdAndUpdate;
  let update;
  User.findByIdAndUpdate = (_id, nextUpdate) => {
    update = nextUpdate;
    return {
      select: async () => ({
        onboardingTourVersion: "v1",
        onboardingTours: nextUpdate.$set.onboardingTours
      })
    };
  };

  try {
    const response = responseMock();
    await authController.updateOnboardingProgress({
      user: { id: "user-1" },
      body: {
        onboardingTourVersion: "v1",
        onboardingTours: {
          completedTours: ["dashboard", "dashboard", "pos-sale"],
          flowStatus: "in_progress",
          flowStep: "pos",
          checklistDismissed: true,
          unexpectedField: "ignored"
        }
      }
    }, response);

    assert.deepEqual(update.$set, {
      onboardingTourVersion: "v1",
      onboardingTours: {
        completedTours: ["dashboard", "pos-sale"],
        flowStatus: "in_progress",
        flowStep: "pos",
        checklistDismissed: true
      }
    });
    assert.deepEqual(response.body.onboardingTours, update.$set.onboardingTours);
  } finally {
    User.findByIdAndUpdate = original;
  }
});
