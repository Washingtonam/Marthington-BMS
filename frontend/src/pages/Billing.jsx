import {
  useEffect,
  useState
} from "react";

import request from "../api/client.js";

const Billing = () => {

  const [billing, setBilling] =
    useState(null);

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

        const data =
          await request(
            "/payments/status"
          );

        setBilling(data);

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

      <div className="page-heading">

        <div>

          <span>
            Monetization
          </span>

          <h1>
            Billing Center
          </h1>

        </div>

      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {/* CURRENT PLAN */}

      <div className="tool-panel">

        <div className="panel-heading">

          <h2>
            Current Subscription
          </h2>

        </div>

        <div className="grid gap-4">

          <div>

            <strong>
              Plan
            </strong>

            <p className="capitalize">
              {billing?.plan}
            </p>

          </div>

          <div>

            <strong>
              Status
            </strong>

            <p className="capitalize">
              {billing?.status}
            </p>

          </div>

          <div>

            <strong>
              Billing Cycle
            </strong>

            <p className="capitalize">
              {
                billing?.billingCycle ||
                "N/A"
              }
            </p>

          </div>

          <div>

            <strong>
              Days Left
            </strong>

            <p>
              {
                billing?.daysLeft ||
                0
              }
              {" "}
              days
            </p>

          </div>

        </div>

      </div>

      {/* PRICING */}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* MONTHLY */}

        <div className="tool-panel border-2 border-gray-200">

          <h2 className="text-xl font-bold">
            Pro Monthly
          </h2>

          <div className="text-4xl font-bold mt-4">
            ₦5,000
          </div>

          <p className="text-gray-500 mt-2">
            Per month
          </p>

          <ul className="mt-6 space-y-2 text-sm">

            <li>
              ✅ Unlimited products
            </li>

            <li>
              ✅ Unlimited staff
            </li>

            <li>
              ✅ WhatsApp receipts
            </li>

            <li>
              ✅ Analytics dashboard
            </li>

            <li>
              ✅ Reports system
            </li>

            <li>
              ✅ Team management
            </li>

          </ul>

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

            className="mt-8 w-full bg-black text-white p-3 rounded-xl"
          >

            {processing ===
            "monthly"
              ? "Processing..."
              : "Upgrade Monthly"}

          </button>

        </div>

        {/* YEARLY */}

        <div className="tool-panel border-2 border-green-500 relative overflow-hidden">

          <div className="absolute top-0 right-0 bg-green-600 text-white text-xs px-3 py-1">
            SAVE MORE
          </div>

          <h2 className="text-xl font-bold">
            Pro Yearly
          </h2>

          <div className="text-4xl font-bold mt-4">
            ₦50,000
          </div>

          <p className="text-gray-500 mt-2">
            Per year
          </p>

          <ul className="mt-6 space-y-2 text-sm">

            <li>
              ✅ Everything in Monthly
            </li>

            <li>
              ✅ Priority support
            </li>

            <li>
              ✅ Future AI tools
            </li>

            <li>
              ✅ Multi-location ready
            </li>

          </ul>

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

            className="mt-8 w-full bg-green-600 text-white p-3 rounded-xl"
          >

            {processing ===
            "yearly"
              ? "Processing..."
              : "Upgrade Yearly"}

          </button>

        </div>

      </div>

    </section>
  );
};

export default Billing;