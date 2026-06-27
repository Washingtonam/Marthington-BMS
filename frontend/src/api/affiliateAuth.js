import request from "./client.js";

export const registerAffiliateUser = async (payload) => {
  return request("/affiliate-auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};
