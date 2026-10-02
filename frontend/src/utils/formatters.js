export const formatCurrency = (amount, currency = "NGN") => {
  const locale = currency === "USD" ? "en-US" : "en-NG";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0
  }).format(amount || 0);
};

export const stockStatus = (stock) => {
  if (stock <= 0) {
    return { label: "Out of stock", tone: "danger" };
  }

  if (stock <= 5) {
    return { label: "Low stock", tone: "warning" };
  }

  return { label: "In stock", tone: "success" };
};
