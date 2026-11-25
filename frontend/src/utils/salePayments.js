export const PAYMENT_METHOD_LABELS = Object.freeze({
  cash: "Cash",
  card: "Card / POS terminal",
  bank_transfer: "Bank transfer",
  credit: "Credit / debt",
  other: "Other"
});

export const normalizeSalePaymentMethod = (value) => {
  const method = String(value ?? "cash").toLowerCase().trim();

  if (["cash", "cash payment", "cash sale", "cashless"].includes(method)) return "cash";
  if (["card", "debit card", "credit card", "visa", "mastercard", "pos", "card payment"].includes(method)) return "card";
  if (["bank transfer", "bank transfer payment", "bank_transfer", "bank-transfer", "bank", "transfer"].includes(method)) return "bank_transfer";
  if (["credit", "debt", "credit sale", "account"].includes(method)) return "credit";

  return "other";
};

export const getSalePaymentBreakdown = (sale = {}) => {
  if (Array.isArray(sale.paymentBreakdown) && sale.paymentBreakdown.length) {
    return sale.paymentBreakdown;
  }
  if (!sale.paymentMethod || sale.paymentMethod === "split") return [];

  return [{
    method: sale.paymentMethod,
    amount: Number(sale.totalAmount || 0),
    reference: sale.paymentReference || ""
  }];
};

export const saleUsesPaymentMethod = (sale, method) => (
  getSalePaymentBreakdown(sale).some(
    (payment) => normalizeSalePaymentMethod(payment.method) === method
  )
);

export const isValidSalePaymentBreakdown = (payments = [], totalAmount = 0) => {
  const hasAtMostTwoDecimals = (value) => /^\d+(?:\.\d{1,2})?$/.test(String(value ?? "").trim());
  const total = Number(totalAmount);
  const totalCents = Math.round(total * 100);
  if (!Array.isArray(payments) || payments.length < 2
    || !Number.isFinite(total) || total <= 0
    || !hasAtMostTwoDecimals(totalAmount)
    || Math.abs(total * 100 - totalCents) >= 0.000001) {
    return false;
  }

  const methods = new Set();
  let paidCents = 0;
  for (const payment of payments) {
    if (!["cash", "card", "bank_transfer", "other"].includes(payment.method)
      || !hasAtMostTwoDecimals(payment.amount)
      || methods.has(payment.method)) {
      return false;
    }

    const amount = Number(payment.amount);
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount <= 0
      || Math.abs(amount * 100 - amountCents) >= 0.000001) {
      return false;
    }

    methods.add(payment.method);
    paidCents += amountCents;
  }

  return paidCents === totalCents;
};

export const aggregateSalePayments = (sales = []) => {
  const totals = { cash: 0, card: 0, bank_transfer: 0, credit: 0, other: 0 };

  for (const sale of sales) {
    const breakdown = getSalePaymentBreakdown(sale);
    for (const payment of breakdown) {
      const method = normalizeSalePaymentMethod(payment.method);
      if (Object.prototype.hasOwnProperty.call(totals, method)) {
        totals[method] += Number(payment.amount || 0);
      }
    }
  }

  return totals;
};
