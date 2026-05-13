import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import request from "./api/client.js";
import { db } from "./api/offlineDb";
import "./index.css";

const Root = () => {
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine) return;

      const pending = await db.pendingSales.toArray();
      if (pending.length === 0) return;

      console.log(`📡 Online! Syncing ${pending.length} pending transactions...`);

      for (const item of pending) {
        try {
          // Attempt to push to server
          await fetch(`https://marthington.onrender.com/api${item.path}`, {
            ...item.options,
            body: JSON.stringify(item.options.body),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("bms_token")}`
            }
          });
          // Remove from local DB if successful
          await db.pendingSales.delete(item.id);
        } catch (e) {
          console.error("Sync failed for item", item.id, e);
        }
      }
    };

    // Listen for network changes
    window.addEventListener('online', syncOfflineData);
    // Also try to sync when app first starts
    syncOfflineData();

    return () => window.removeEventListener('online', syncOfflineData);
  }, []);

  return <App />;
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);