export const DEFAULT_PRODUCT_MARKUP = 30;

export const suggestSellingPrice = (costPrice, markup = DEFAULT_PRODUCT_MARKUP) => {
  const cost = Number(costPrice);
  const percentage = Number(markup);
  if (!Number.isFinite(cost) || !Number.isFinite(percentage)) return "";
  return String(cost * (1 + percentage / 100));
};

export const calculateMarkup = (costPrice, sellingPrice) => {
  const cost = Number(costPrice);
  const selling = Number(sellingPrice);
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(selling)) return "";
  return String(((selling / cost) - 1) * 100);
};
