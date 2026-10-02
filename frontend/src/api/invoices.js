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

export const bulkUpdateInvoiceStatus = (invoiceIds, status) =>
  request("/invoices/bulk-status", {
    method: "POST",
    body: JSON.stringify({ invoiceIds, status })
  });

export const bulkDeleteInvoices = (invoiceIds) =>
  request("/invoices/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ invoiceIds })
  });

export const getInvoice = (id) =>
  request(`/invoices/${id}`);

export const updateInvoicePayment = (invoiceId, paymentAmount, paymentMethod = "cash", referenceNumber = "", notes = "") =>
  request(`/invoices/${invoiceId}/payment`, {
    method: "PUT",
    body: JSON.stringify({ paymentAmount, paymentMethod, referenceNumber, notes })
  });

export const completeInvoicePickup = (invoiceId) =>
  request(`/invoices/${invoiceId}/complete-pickup`, { method: "POST" });

export const updateInvoiceItemProgress = (invoiceId, itemIndex, serviceStatus) =>
  request(`/invoices/${invoiceId}/item-progress`, {
    method: "PUT",
    body: JSON.stringify({ itemIndex, serviceStatus })
  });

export const getInvoicePayments = (invoiceId) =>
  request(`/invoices/${invoiceId}/payments`);

export const updateInvoice = (invoiceId, data) =>
  request(`/invoices/${invoiceId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });

export const deleteInvoice = (invoiceId) =>
  request(`/invoices/${invoiceId}`, {
    method: "DELETE"
  });

export const shareInvoice = (invoiceId, recipientEmail, message = "") =>
  request(`/invoices/${invoiceId}/share`, {
    method: "POST",
    body: JSON.stringify({ recipientEmail, message })
  });

export const getInvoiceEmailHistory = (invoiceId) =>
  request(`/invoices/${invoiceId}/email-history`);