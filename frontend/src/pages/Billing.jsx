import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const Billing = () => {
  const { refreshBusiness } = useAuth();

  const [billing, setBilling] =
    useState(null);

  const [pricing, setPricing] = useState({
    yearly: { ngn: 150000 }
  });
  const [planAccess, setPlanAccess] = useState({
    free: { products: 20, staff: 1, posProducts: 500, features: {} },
    pro: { products: null, staff: null, posProducts: null, features: {} }
  });

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const [error, setError] = useState("");

  // =====================================
  // LOAD
  // =====================================

  useEffect(() => {
    const load = async () => {
      try {
        const [billingData, pricingData] = await Promise.all([
          request("/payments/status"),
          request("/billing/pricing")
        ]);

        setBilling(billingData);

        const pricingPayload = pricingData?.data;
        if (pricingPayload?.yearly?.ngn) {
          setPricing({ yearly: { ngn: pricingPayload.yearly.ngn } });
        }
        if (pricingData?.planAccess?.free && pricingData?.planAccess?.pro) {
          setPlanAccess(pricingData.planAccess);
        }
      } catch (err) {
        setError(err?.message || "Failed to load billing details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handlePaymentCallback = useCallback(async (reference) => {
    if (!reference) return;

    setVerifyingPayment(true);
    setPaymentMessage("Finalizing your payment and updating your plan...");

    try {
      const result = await request("/payments/verify-redirect", {
        method: "POST",
        body: JSON.stringify({ reference })
      });

      await refreshBusiness();

      setBilling((current) => current ? {
        ...current,
        plan: result?.subscription?.plan || "pro",
        status: result?.subscription?.status || "active",
        billingCycle: result?.subscription?.billingCycle || current.billingCycle,
        expiresAt: result?.subscription?.expiresAt || current.expiresAt,
        isPro: true
      } : current);

      setPaymentMessage(result?.message || "Payment verified successfully. Your Pro features are now active.");
    } catch (err) {
      setPaymentMessage(err?.message || "Payment verification failed. Please try again.");
    } finally {
      setVerifyingPayment(false);
    }
  }, [refreshBusiness]);

  // =====================================
  // UPGRADE
  // =====================================

  const handlePayment = async () => {
    try {
      setProcessing("yearly");
      setError("");
      setPaymentMessage("");

      const amount = pricing.yearly.ngn * 100;

      const data = await request("/payments/initialize", {
        method: "POST",
        body: JSON.stringify({ billingCycle: "yearly", currency: "NGN", amount })
      });

      const url = data?.authorizationUrl || data?.url || data?.link;
      if (!url) {
        throw new Error("Could not get the checkout URL from the server.");
      }

      const popup = window.open(url, "_blank", "width=720,height=760,top=80,left=80");
      if (!popup) {
        throw new Error("Please allow popups to complete your checkout.");
      }

      let popupTimer = window.setInterval(() => {
        try {
          const popupUrl = popup.location.href;
          const popupReference = new URL(popupUrl).searchParams.get("reference");

          if (popupUrl.startsWith(window.location.origin) && popupReference) {
            window.clearInterval(popupTimer);
            popup.close();
            void handlePaymentCallback(popupReference);
          }
        } catch {
          // Ignore cross-origin transitions until the redirect reaches the app.
        }

        if (popup.closed) {
          window.clearInterval(popupTimer);
        }
      }, 800);
    } catch (err) {
      setError(err?.message || "Payment initialization failed.");
    } finally {
      setProcessing("");
    }
  };

  const limitLabel = (limit) => limit === null ? "Unlimited" : Number(limit).toLocaleString("en-NG");

  if (loading) {

    return (
      <div className="p-6">
        Loading billing...
      </div>
    );
  }

  return (

    <section className="page-stack">

      {/* HEADER */}

      <div className="page-heading">

        <div>

          <span>
            Subscription
          </span>

          <h1>
            Billing Center
          </h1>

          <p className="mt-2 text-gray-500">
            Compare Free and Pro clearly, with straightforward annual billing in Nigerian Naira.
          </p>

        </div>

      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {verifyingPayment && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          <span>{paymentMessage || "Finalizing your payment..."}</span>
        </div>
      )}

      {!verifyingPayment && paymentMessage && (
        <div className={`rounded-2xl border p-4 text-sm ${paymentMessage.toLowerCase().includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {paymentMessage}
        </div>
      )}

      {/* CURRENT PLAN */}

      <div className="tool-panel rounded-3xl border border-gray-200">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>

            <p className="text-sm uppercase tracking-wider text-gray-500 font-semibold">
              Current Subscription
            </p>

            <h2 className="text-4xl font-extrabold mt-2 capitalize">
              {billing?.plan || "Free"}
            </h2>

            <p className="mt-2 text-gray-500 capitalize">
              {billing?.status || "inactive"}
            </p>

          </div>

          <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">

            <div className="bg-gray-50 rounded-2xl p-4 min-w-[150px]">

              <p className="text-xs text-gray-500 uppercase">
                Billing Cycle
              </p>

              <h3 className="text-xl font-bold mt-2 capitalize">
                {
                  billing?.billingCycle ||
                  "N/A"
                }
              </h3>

            </div>

            <div className="bg-gray-50 rounded-2xl p-4 min-w-[150px]">

              <p className="text-xs text-gray-500 uppercase">
                Days Left
              </p>

              <h3 className="text-xl font-bold mt-2">
                {
                  billing?.daysLeft ||
                  0
                } days
              </h3>

            </div>

          </div>

        </div>

      </div>

      {/* PRICING */}

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[32px] border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Free Mode</h2>
          <h3 className="mt-3 text-3xl font-extrabold">Start managing your business</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">Core POS and business tools with clear product and staff limits.</p>
          <p className="mt-6 text-5xl font-black">{formatCurrency(0)}<span className="ml-2 text-base font-semibold text-slate-500">/ always free</span></p>
          <ul className="mt-7 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
            <li>✓ Up to {limitLabel(planAccess.free.products)} products</li>
            <li>✓ Up to {limitLabel(planAccess.free.staff)} additional staff account(s); the owner is separate</li>
            <li>✓ POS product listing up to {limitLabel(planAccess.free.posProducts)} items</li>
            <li>✓ Sales and reports, subject to staff permissions</li>
            <li>✓ Branch access is controlled by role and assignment; no plan branch cap is configured</li>
            <li>✓ No plan-based transaction limit is configured</li>
          </ul>
        </article>

        <article className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-700 to-emerald-600 p-8 text-white shadow-xl">
          <h2 className="absolute right-6 top-6 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">Pro Mode</h2>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">For growing Nigerian businesses</p>
          <h3 className="mt-3 text-3xl font-extrabold">More room to grow</h3>
          <p className="mt-3 text-sm leading-6 text-emerald-100">Expand your catalogue and team with Pro tools.</p>
          <p className="mt-6 text-5xl font-black">{formatCurrency(pricing.yearly.ngn)}<span className="ml-2 text-base font-semibold text-emerald-100">/ year</span></p>
          <ul className="mt-7 space-y-3 border-t border-white/20 pt-6 text-sm text-emerald-50">
            <li>✓ {limitLabel(planAccess.pro.products)} products, staff accounts, and POS product listing capacity</li>
            {planAccess.pro.features.invoices && <li>✓ Invoices enabled by the Pro plan configuration</li>}
            {planAccess.pro.features.logoUpload && <li>✓ Business logo upload</li>}
            {planAccess.pro.features.customReceiptThemes && <li>✓ Custom receipt themes</li>}
            {planAccess.pro.features.businessChat && <li>✓ Business chat</li>}
            <li>✓ WhatsApp auto-receipts are available with an active Pro subscription</li>
            <li>✓ Reports remain subject to staff permissions; branch access remains subject to role and assignment</li>
            <li>✓ No plan-based transaction or branch limit is configured</li>
          </ul>
          <button
            type="button"
            onClick={handlePayment}
            disabled={Boolean(processing)}
            className="mt-8 w-full rounded-2xl bg-white py-4 font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            {processing ? "Processing..." : billing?.isPro ? "Renew Pro for one year" : "Upgrade to Pro"}
          </button>
          <p className="mt-3 text-center text-xs text-emerald-100">Checkout is in Nigerian Naira (₦).</p>
        </article>
      </div>

      {/* TRUST */}

      <div className="grid gap-6 md:grid-cols-3">

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <h3 className="font-bold text-2xl">
            Smart Receipts
          </h3>

          <p className="mt-3 text-gray-500">
            Professional PDF and WhatsApp receipts
            that improve customer trust.
          </p>

        </div>

        <div className="bg-white border rounded-3xl p-6 shadow-sm">

          <h3 className="font-bold text-2xl">
            Cloud Sync
          </h3>

          <p className="mt-3 text-gray-500">
            Access your business securely from
            anywhere and any device.
          </p>

        </div>

        <div className="bg-white border rounded-3xl p-6 shadow-sm">

          <h3 className="font-bold text-2xl">
            Business Growth
          </h3>

          <p className="mt-3 text-gray-500">
            Scale your operations with analytics,
            inventory and team management.
          </p>

        </div>

      </div>

    </section>
  );
};

export default Billing;