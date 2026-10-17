import { createHash, randomBytes } from "node:crypto";

export const hashPasswordResetToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const createPasswordResetToken = (now = Date.now()) => {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hashedToken: hashPasswordResetToken(token),
    expiresAt: new Date(now + 30 * 60 * 1000)
  };
};
