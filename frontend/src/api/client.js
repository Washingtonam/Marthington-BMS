import { db } from "./offlineDb";

const API_URL = "https://marthington.onrender.com/api";

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

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.clear(); 
      return;
    }

    if (!response.ok) throw new Error(data.message || "Request failed.");

    // SUCCESS CASE: If we just fetched products, update the offline cache
    if (path === "/products" && !options.method) {
      await db.products.bulkPut(data);
    }

    return data;

  } catch (err) {
    // OFFLINE CASE: If it's a POST/PUT (like making a sale) and we have no network
    if (options.method === "POST" && path.includes("/sales")) {
      console.warn("Offline detected. Saving sale to local queue...");
      
      await db.pendingSales.add({
        path,
        options: {
            ...options,
            body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body
        },
        timestamp: Date.now()
      });

      return { success: true, offline: true, message: "Sale saved locally. Will sync when online." };
    }

    // If it's a GET request (like checking a price), try loading from IndexedDB
    if (!options.method || options.method === "GET") {
      if (path === "/products") {
        const localData = await db.products.toArray();
        if (localData.length > 0) return localData;
      }
    }

    throw err;
  }
};

export default request;