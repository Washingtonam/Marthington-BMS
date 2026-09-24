import request from "./client.js";

export const getStaff = async () => {
  return request("/staff");
};

export const createStaff = async (payload) => {
  return request("/staff", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const updateStaff = async (id, payload) => {
  return request(`/staff/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

export const toggleStaffStatus = async (id) => {
  return request(`/staff/${id}/status`, {
    method: "PATCH"
  });
};