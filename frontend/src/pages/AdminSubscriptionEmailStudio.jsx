import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import request from "../api/client.js";
import SubscriptionEmailComposer from "../components/SubscriptionEmailComposer.jsx";

const audiences = new Set([
  "subscription_all",
  "subscription_active_pro",
  "subscription_expiring_7",
  "subscription_expiring_30",
  "subscription_trial",
  "subscription_expired"
]);

const AdminSubscriptionEmailStudio = () => {
  const [searchParams] = useSearchParams();
  const requestedAudience = searchParams.get("audience");
  const initialAudience = audiences.has(requestedAudience) ? requestedAudience : "subscription_all";
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    request("/admin/subscriptions")
      .then((data) => {
        if (active) setSubscriptions(data.subscriptions || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Could not load subscriptions for email preview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="page-stack mx-auto max-w-7xl">
      <Link to="/admin/subscriptions" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-700">
        <span aria-hidden="true">←</span> Back to subscriptions
      </Link>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">Loading subscription email studio...</div>
      ) : (
        <SubscriptionEmailComposer subscriptions={subscriptions} initialAudience={initialAudience} />
      )}
    </section>
  );
};

export default AdminSubscriptionEmailStudio;
