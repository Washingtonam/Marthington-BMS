import request, { AFFILIATE_DEMO_MODE } from "./client.js";
import { loginAffiliateDemo } from "./affiliateDemo.js";

export const loginUser = async (payload) => {
  if (AFFILIATE_DEMO_MODE) return loginAffiliateDemo(payload);

  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const registerUser = async (payload) => {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const requestPasswordReset = async (email) => {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
};

export const resetPassword = async (payload) => {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getCurrentUser = async () => {
  return request("/auth/me");
};
