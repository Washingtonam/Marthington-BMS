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
