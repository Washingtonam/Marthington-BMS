import request from "./client.js";

export const getInvoices =
  () => request("/invoices");

export const createInvoice =
  (data) =>
    request("/invoices", {
      method: "POST",
      body: JSON.stringify(data)
    });

export const getInvoice =
  (id) =>
    request(`/invoices/${id}`);