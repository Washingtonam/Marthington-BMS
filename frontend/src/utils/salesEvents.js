export const SALES_UPDATED_EVENT = "sales:updated";

export const notifySalesUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SALES_UPDATED_EVENT));
};

export const subscribeToSalesUpdates = (callback) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SALES_UPDATED_EVENT, callback);
  return () => window.removeEventListener(SALES_UPDATED_EVENT, callback);
};
