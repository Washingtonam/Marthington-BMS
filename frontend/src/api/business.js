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
  formData.append("receiptFooter", payload.receiptFooter ?? "");
  formData.append("receiptTheme", payload.receiptTheme ?? "");
  formData.append("businessType", payload.businessType ?? "general_services");

  // 🔥 FILE UPLOAD
  if (payload.logo instanceof File) {
    formData.append("logo", payload.logo);
  }

  // 🔥 REMOVE LOGO SIGNAL
  if (payload.logo === "") {
    formData.append("logo", "");
  }

  return await request("/business", {
    method: "PUT",
    body: formData
  });
};