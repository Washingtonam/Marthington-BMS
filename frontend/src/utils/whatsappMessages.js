import { formatCurrency } from "./formatters.js";

export const normalizeWhatsAppNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  return digits;
};

export const buildWhatsAppUrl = (phone, message) => {
  const number = normalizeWhatsAppNumber(phone);
  if (number.length < 7 || !message) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

export const openWhatsAppMessage = (phone, message) => {
  const url = buildWhatsAppUrl(phone, message);
  if (!url || typeof window === "undefined") return false;
  const popup = window.open(url, "_blank");
  if (popup) popup.opener = null;
  return Boolean(popup);
};

const getItemTotal = (item) => Number(
  item.total ?? item.totalAmount ?? (Number(item.quantity || 0) * Number(item.price ?? item.sellingPrice ?? 0))
);

const getPaymentStatus = (record, recordType) => {
  if (recordType === "invoice") {
    if (record.paymentStatus) return record.paymentStatus;
    if (Number(record.balanceDue || 0) <= 0) return "Fully Paid";
    return Number(record.amountPaid || 0) > 0 ? "Partially Paid" : "Unpaid";
  }

  if (record.paymentStatus === "rejected") return "Payment needs review";
  return record.paymentMethod === "credit" ? "Unpaid (credit sale)" : "Paid";
};

export const buildTransactionWhatsAppMessage = ({
  record,
  recordType = "sale",
  businessName = "our store",
  customerName = "there",
  receiptUrl = ""
}) => {
  if (!record) return "";

  const items = (record.items || []).map((item) => {
    const quantity = Number(item.quantity || 0);
    const total = getItemTotal(item);
    return `• ${item.name || "Item"} × ${quantity} — ${formatCurrency(total)}`;
  });
  const reference = recordType === "invoice"
    ? record.invoiceNumber || record._id
    : record.receiptId || record._id;
  const heading = recordType === "invoice" ? "Invoice" : "Receipt";

  return [
    `Hello ${customerName || "there"},`,
    "",
    `Thank you for choosing ${businessName || "our store"}. Here is your ${heading.toLowerCase()} summary:`,
    reference ? `Reference: ${reference}` : "",
    "",
    ...items,
    "",
    `Total: ${formatCurrency(record.totalAmount || 0)}`,
    `Payment status: ${getPaymentStatus(record, recordType)}`,
    receiptUrl ? `View receipt: ${receiptUrl}` : "",
    "",
    "Please contact us if you have any questions."
  ].filter((line) => line !== undefined).join("\n");
};

export const buildCustomerFollowUpMessage = ({
  record,
  businessName = "our store",
  customerName = "there"
}) => {
  if (!record) return "";

  const itemNames = [...new Set((record.items || []).map((item) => item.name).filter(Boolean))];
  const itemSummary = itemNames.length
    ? itemNames.slice(0, 3).join(", ") + (itemNames.length > 3 ? " and more" : "")
    : "your recent purchase";

  return [
    `Hello ${customerName || "there"},`,
    "",
    `This is ${businessName || "our store"} checking in about ${itemSummary}. We hope everything is working well.`,
    "Would you like to purchase it again or check current availability? Reply here and we will be happy to help."
  ].join("\n");
};
