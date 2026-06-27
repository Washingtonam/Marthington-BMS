import request from "./client.js";

export const getInvoices = (params = {}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return request(`/invoices${query ? `?${query}` : ""}`);
};

export const createInvoice = (data) =>
  request("/invoices", {
    method: "POST",
    body: JSON.stringify(data)
  });

export const getInvoice = (id) =>
  request(`/invoices/${id}`);

export const updateInvoicePayment = (invoiceId, paymentAmount) =>
  request(`/invoices/${invoiceId}/payment`, {
    method: "PUT",
    body: JSON.stringify({ paymentAmount })
  });