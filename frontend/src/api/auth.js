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
