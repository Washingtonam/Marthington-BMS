import {
  useEffect,
  useState
} from "react";

import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const Billing = () => {

  const [billing, setBilling] =
    useState(null);

  const [pricing, setPricing] =
    useState({ monthly: 15000, yearly: 150000 });

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState("");

  const [error, setError] =
    useState("");

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

        if (pricingPayload?.monthly?.ngn && pricingPayload?.yearly?.ngn) {
          setPricing({
            monthly: pricingPayload.monthly.ngn,
            yearly: pricingPayload.yearly.ngn
          });
        }

      } catch (err) {

        setError(
          err.message
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  // =====================================
  // UPGRADE
  // =====================================

  const upgrade = async (
    billingCycle
  ) => {

    try {

      setProcessing(
        billingCycle
      );

      const data =
        await request(
          "/payments/initialize",
          {
            method: "POST",

            body:
              JSON.stringify({
                billingCycle
              })
          }
        );

      window.location.href =
        data.authorizationUrl;

    } catch (err) {

      alert(
        err.message
      );

    } finally {

      setProcessing("");
    }
  };

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
            Manage your subscription, unlock premium tools
            and scale your business faster.
          </p>

        </div>

      </div>

      {error && (
        <div className="form-error">
          {error}
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

      <div className="grid lg:grid-cols-2 gap-8">

        {/* MONTHLY */}

        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8 relative overflow-hidden">

          <div className="mb-8">

            <h2 className="text-3xl font-extrabold">
              Pro Monthly
            </h2>

            <div className="mt-6 flex items-end gap-2">

              <span className="text-6xl font-black">
                {formatCurrency(pricing.monthly)}
              </span>

              <span className="text-gray-500 mb-2">
                / month
              </span>

            </div>

            <p className="text-gray-500 mt-4 leading-7">
              Perfect for growing businesses that want
              modern receipts, reports, staff controls
              and unlimited products.
            </p>

          </div>

          <div className="space-y-4 text-sm">

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Unlimited products</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Unlimited staff accounts</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>WhatsApp receipts</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Premium receipt templates</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>PDF exports</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Analytics dashboard</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Business reports</span>
            </div>

          </div>

          <button
            onClick={() =>
              upgrade(
                "monthly"
              )
            }

            disabled={
              processing ===
              "monthly"
            }

            className="mt-10 w-full bg-black hover:bg-gray-900 text-white p-4 rounded-2xl font-bold transition"
          >

            {processing ===
            "monthly"
              ? "Processing..."
              : "Upgrade Monthly"}

          </button>

        </div>

        {/* YEARLY */}

        <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-[32px] shadow-xl p-8 relative overflow-hidden">

          <div className="absolute top-5 right-5 bg-white text-green-700 text-xs px-4 py-2 rounded-full font-bold">
            SAVE {formatCurrency(Math.max(0, pricing.monthly * 12 - pricing.yearly))}
          </div>

          <div className="mb-8">

            <h2 className="text-3xl font-extrabold">
              Pro Yearly
            </h2>

            <div className="mt-6 flex items-end gap-2">

              <span className="text-6xl font-black">
                {formatCurrency(pricing.yearly)}
              </span>

              <span className="text-green-100 mb-2">
                / year
              </span>

            </div>

            <p className="text-green-100 mt-4 leading-7">
              Best for serious businesses that want long-term
              growth with maximum savings and future upgrades.
            </p>

          </div>

          <div className="space-y-4 text-sm">

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Everything in Monthly</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Priority support</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Early access to AI tools</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Multi-location ready</span>
            </div>

            <div className="flex items-center gap-3">
              <span>✅</span>
              <span>Future enterprise features</span>
            </div>

          </div>

          <button
            onClick={() =>
              upgrade(
                "yearly"
              )
            }

            disabled={
              processing ===
              "yearly"
            }

            className="mt-10 w-full bg-white text-green-700 hover:bg-gray-100 p-4 rounded-2xl font-bold transition"
          >

            {processing ===
            "yearly"
              ? "Processing..."
              : "Upgrade Yearly"}

          </button>

        </div>

      </div>

      {/* TRUST */}

      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-white border rounded-3xl p-6 shadow-sm">

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