import request, { AFFILIATE_DEMO_MODE } from "./client.js";
import { registerAffiliateDemo } from "./affiliateDemo.js";

export const registerAffiliateUser = async (payload) => {
  if (AFFILIATE_DEMO_MODE) return registerAffiliateDemo(payload);

  return request("/affiliate-auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};
