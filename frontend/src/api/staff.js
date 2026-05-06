import request from "./client.js";

export const getStaff = async () => {
  return request("/users");
};

export const createStaff = async (payload) => {
  return request("/users/staff", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const updateStaff = async (id, payload) => {
  return request(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

export const toggleStaffStatus = async (id) => {
  return request(`/users/${id}/status`, {
    method: "PATCH"
  });
};