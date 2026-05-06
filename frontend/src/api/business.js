import request from "./client.js";

// 🔥 GET BUSINESS (SAFE + CONSISTENT)
export const getBusiness = async () => {
  try {
    return await request("/business");
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

    throw err;
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