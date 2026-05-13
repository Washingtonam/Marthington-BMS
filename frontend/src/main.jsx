import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import request from "./api/client.js";
import { db } from "./api/offlineDb";
import "./index.css";
// 👇 ADD THIS LINE BACK - This is likely where your layout grid lives!
import "./styles.css"; 

const Root = () => {
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!navigator.onLine) return;

      const pending = await db.pendingSales.toArray();
      if (pending.length === 0) return;

      console.log(`📡 Online! Syncing ${pending.length} pending transactions...`);

      for (const item of pending) {
        try {
          await fetch(`https://marthington.onrender.com/api${item.path}`, {
            ...item.options,
            body: JSON.stringify(item.options.body),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("bms_token")}`
            }
          });
          await db.pendingSales.delete(item.id);
        } catch (e) {
          console.error("Sync failed for item", item.id, e);
        }
      }
    };

    window.addEventListener('online', syncOfflineData);
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