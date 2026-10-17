import request from "./client.js";

export const loginUser = async (payload) => {
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
