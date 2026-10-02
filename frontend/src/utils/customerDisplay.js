export const buildCustomerDisplayUrl = (baseUrl = window.location.href) => {
  const url = new URL(baseUrl, window.location.origin);
  url.pathname = "/";
  url.hash = "/app/customer-view";
  return url.toString();
};

export const resolveCustomerDisplayTitle = (businessName = "", customMessage = "") => {
  const cleanedBusinessName = String(businessName ?? "").trim();
  const cleanedCustomMessage = String(customMessage ?? "").trim();

  if (cleanedCustomMessage) {
    return cleanedCustomMessage;
  }

  if (cleanedBusinessName) {
    return `Welcome to ${cleanedBusinessName}`;
  }

  return "Welcome";
};
