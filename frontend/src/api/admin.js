import request from "./client.js";

export const getPayoutRequests = async (query = "") => {
  const q = query ? `?${query}` : "";
  return request(`/admin/payout-requests${q}`);
};

export const approvePayout = async (id, payload = {}) => {
  return request(`/admin/payout-requests/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

export const rejectPayout = async (id, payload = {}) => {
  return request(`/admin/payout-requests/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

export default {
  getPayoutRequests,
  approvePayout,
  rejectPayout
};
