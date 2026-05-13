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
    
    // If the server is down or returns a 5xx error, jump to catch block to try offline
    if (response.status >= 500) throw new Error("Server Error");

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
      return;
    }

    if (!response.ok) throw new Error(data.message || "Request failed.");

    // SUCCESS: If we are fetching products, save them to IndexedDB for next time
    if (path.includes("/products") && (!options.method || options.method === "GET")) {
       // Ensure data is an array before saving
       const productsArray = Array.isArray(data) ? data : (data.products || []);
       if (productsArray.length > 0) {
         await db.products.clear(); // Fresh sync
         await db.products.bulkPut(productsArray);
       }
    }

    return data;

  } catch (err) {
    console.warn(`Network fail for ${path}, checking offline database...`);

    // OFFLINE FALLBACK: Load inventory from IndexedDB
    if (path.includes("/products") && (!options.method || options.method === "GET")) {
      const localProducts = await db.products.toArray();
      if (localProducts.length > 0) {
        return localProducts; // Return the cached inventory
      }
    }

    // OFFLINE POST: Queue sales if network is dead
    if (options.method === "POST" && path.includes("/sales")) {
      await db.pendingSales.add({
        path,
        options: {
            ...options,
            body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body
        },
        timestamp: Date.now()
      });
      return { success: true, offline: true };
    }

    throw err;
  }
};

export default request;