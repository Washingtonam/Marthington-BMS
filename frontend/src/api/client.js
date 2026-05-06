const API_URL =
  "https://marthington.onrender.com/api";
const clearSession = () => {
  localStorage.removeItem("bms_token");
  localStorage.removeItem("bms_user");
  localStorage.removeItem("bms_impersonation");
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem("bms_token");
  const impersonation = localStorage.getItem("bms_impersonation");

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),

    ...(token ? { Authorization: `Bearer ${token}` } : {}),

    ...(impersonation ? { "x-business-id": impersonation } : {}),

    ...options.headers
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  // 🔥 AUTO RESET BAD SESSION
  if (
    response.status === 401 ||
    data.message?.includes("Invalid") ||
    data.message?.includes("expired") ||
    data.message?.includes("No business linked")
  ) {
    clearSession();
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
};

export default request;