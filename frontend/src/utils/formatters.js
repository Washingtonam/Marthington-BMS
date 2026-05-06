export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
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
