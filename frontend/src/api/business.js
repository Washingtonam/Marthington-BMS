import request from "./client.js";

const businessFallback = {
  name: "Loading Profile...",
  industryType: "retail"
};

// 🔥 GET BUSINESS (SAFE + CONSISTENT)
export const getBusiness = async () => {
  try {
    const response = await request("/business");
    return response?.data ?? response ?? null;
  } catch (err) {
    // 🔥 HANDLE AUTH / EMPTY STATE CLEANLY
    if (
      err.message?.toLowerCase().includes("no token") ||
      err.message?.toLowerCase().includes("unauthorized") ||
      err.message?.toLowerCase().includes("invalid") ||
      err.message?.toLowerCase().includes("not found")
    ) {
      return null;
    }

    console.error("Business fetch failed:", err.message);
    return businessFallback;
  }
};

// 🔥 UPDATE BUSINESS (ROBUST FORM HANDLING)
export const updateBusiness = async (payload = {}) => {
  const formData = new FormData();

  formData.append("name", payload.name ?? "");
  formData.append("address", payload.address ?? "");
  formData.append("phone", payload.phone ?? "");
  formData.append("email", payload.email ?? "");
  formData.append("website", payload.website ?? "");
  formData.append("supportEmail", payload.supportEmail ?? "");
  formData.append("supportPhone", payload.supportPhone ?? "");
  formData.append("reportNotificationsEnabled", payload.reportNotificationsEnabled ?? true);
  formData.append("reportDeliveryTime", payload.reportDeliveryTime ?? "18:00");
  formData.append("reportDay", payload.reportDay ?? "current");
  formData.append("receiptFooter", payload.receiptFooter ?? "");
  formData.append("customerDisplayMessage", payload.customerDisplayMessage ?? "");
  formData.append("receiptTheme", payload.receiptTheme ?? "");
  if (payload.brandPrimaryColor !== undefined) {
    formData.append("brandPrimaryColor", payload.brandPrimaryColor);
  }
  formData.append("businessType", payload.businessType ?? "general_services");
  formData.append("whatsappEnabled", payload.whatsappEnabled ?? false);
  formData.append("whatsappNumber", payload.whatsappNumber ?? "");
  formData.append("whatsappWebhookSecret", payload.whatsappWebhookSecret ?? "");
  formData.append("whatsappApiMode", payload.whatsappApiMode ?? "meta");
  formData.append("paymentBankName", payload.paymentBankName ?? "");
  formData.append("paymentAccountName", payload.paymentAccountName ?? "");
  formData.append("paymentAccountNumber", payload.paymentAccountNumber ?? "");
  formData.append("paymentWalletName", payload.paymentWalletName ?? "");
  formData.append("paymentWalletNumber", payload.paymentWalletNumber ?? "");
  formData.append("paymentTransferInstructions", payload.paymentTransferInstructions ?? "");
  if (payload.removeLogo === true) {
    formData.append("removeLogo", "true");
  }
  if (payload.showLogo !== undefined) formData.append("showLogo", String(payload.showLogo));
  if (payload.showBusinessAddress !== undefined) formData.append("showBusinessAddress", String(payload.showBusinessAddress));
  if (payload.showPhone !== undefined) formData.append("showPhone", String(payload.showPhone));
  if (payload.showEmail !== undefined) formData.append("showEmail", String(payload.showEmail));
  if (payload.watermarkText !== undefined) formData.append("watermarkText", payload.watermarkText);

  // Upload or remove a logo only when the user explicitly selected an action.
  if (payload.logo instanceof File) {
    formData.append("logo", payload.logo);
  }
  if (payload.removeLogo === true) {
    formData.append("logo", "");
  }

  return await request("/business", {
    method: "PUT",
    body: formData
  });
};