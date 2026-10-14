import test from "node:test";
import assert from "node:assert/strict";
import User from "../src/modules/users/user.model.js";

test("user appearance stores a validated default accent color", () => {
  const accentColor = User.schema.path("appearance.accentColor");
  assert.equal(accentColor.options.default, "#10b981");
  assert.ok(accentColor.options.match.test("#2563eb"));
  assert.ok(!accentColor.options.match.test("blue"));
});
