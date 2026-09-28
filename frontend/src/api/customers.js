import request from "./client.js";

export const getCustomers =
  () => request("/customers");

export const createCustomer = async (payload) => {
  return request("/customers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getCustomer =
  (id) =>
    request(`/customers/${id}`);

export const updateCustomer = (id, payload) =>
  request(`/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });