import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPasswordResetToken,
  hashPasswordResetToken
} from "../src/modules/auth/passwordResetToken.js";

test("password reset tokens are unpredictable-sized hex strings stored as hashes", () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, first.hashedToken);
  assert.equal(first.hashedToken, hashPasswordResetToken(first.token));
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.hashedToken, second.hashedToken);
});

test("password reset token expiry is 30 minutes from its creation time", () => {
  const now = Date.UTC(2026, 9, 17, 20, 0);
  const resetToken = createPasswordResetToken(now);

  assert.equal(resetToken.expiresAt.getTime(), now + 30 * 60 * 1000);
});
