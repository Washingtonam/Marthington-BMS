import request from "./client.js";

export const getCustomers =
  () => request("/customers");

export const getCustomer =
  (id) =>
    request(`/customers/${id}`);