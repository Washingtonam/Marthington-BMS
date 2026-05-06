import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { updateBusiness } from "../api/business.js";
import { useAuth } from "../context/AuthContext.jsx";



const Settings = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const location = useLocation();

  const {
    business,
    isPro,
    refreshBusiness,
    loadingBusiness
  } = useAuth();

  const [activeTab, setActiveTab] = useState("business");

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    receiptFooter: "",
    receiptTheme: "modern",
    logo: ""
  });

  const [loading, setLoading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // 🔥 SYNC FORM
  useEffect(() => {
    if (!business) return;

    setForm({
      name: business.name || "",
      address: business.address || "",
      phone: business.phone || "",
      email: business.email || "",
      receiptFooter: business.receiptFooter || "",
      receiptTheme: business.receiptTheme || "modern",
      logo: ""
    });
  }, [business]);

  // 🔥 VERIFY PAYMENT
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get("reference");

    if (reference) {
      setVerifying(true);

      fetch(`${API_URL}/payments/verify?reference=${reference}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("bms_token")}`
        }
      })
        .then((res) => res.json())
        .then(async () => {
          await refreshBusiness();
          setUpgradeMsg("🎉 Upgrade successful! You are now on Pro.");
          setVerifying(false);
        })
        .catch(() => {
          setUpgradeMsg("Payment verification failed");
          setVerifying(false);
        });
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "receiptTheme" && !isPro && value !== "modern") {
      setUpgradeMsg("Custom themes are available on Pro plan.");
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogo = async (e) => {
    if (!isPro) {
      setUpgradeMsg("Logo upload is a Pro feature.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");

      const MAX_WIDTH = 300;
      const scale = Math.min(1, MAX_WIDTH / img.width);

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg"
          });

          setForm((prev) => ({
            ...prev,
            logo: compressedFile
          }));
        },
        "image/jpeg",
        0.7
      );
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateBusiness(form);
      setUpgradeMsg("Settings updated successfully");
      await refreshBusiness();
    } catch (err) {
      setUpgradeMsg(err.message);
    }

    setLoading(false);
  };

  const handleUpgrade = async (cycle) => {
    try {
      setProcessingPayment(true);

      const res = await fetch(
        `${API_URL}/payments/initialize?cycle=${cycle}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("bms_token")}`
          }
        }
      );

      const data = await res.json();

      if (!data.authorization_url) {
        throw new Error("Payment init failed");
      }

      window.location.href = data.authorization_url;

    } catch {
      setUpgradeMsg("Payment failed. Try again.");
      setProcessingPayment(false);
    }
  };

  if (loadingBusiness) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">

      {/* SIDEBAR */}
      <aside className="bg-white border rounded-2xl p-5 h-fit shadow-sm">
        <h2 className="font-bold mb-4 text-lg">Settings</h2>

        {[
          { key: "business", label: "Business" },
          { key: "receipt", label: "Receipts" },
          { key: "billing", label: "Plan & Billing 💰" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm mb-1 ${
              activeTab === tab.key
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      {/* MAIN */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {upgradeMsg && (
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md text-sm">
            {upgradeMsg}
          </div>
        )}

        {verifying && (
          <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-md text-sm">
            Verifying payment...
          </div>
        )}

        {/* BUSINESS */}
        {activeTab === "business" && (
          <div className="tool-panel">
            <h2 className="font-bold text-lg mb-4">Business Profile</h2>

            <div className="grid gap-4">
              <input name="name" value={form.name} onChange={handleChange} />
              <input name="phone" value={form.phone} onChange={handleChange} />
              <input name="address" value={form.address} onChange={handleChange} />
              <input name="email" value={form.email} onChange={handleChange} />
            </div>
          </div>
        )}

        {/* RECEIPTS */}
        {activeTab === "receipt" && (
          <div className="tool-panel">
            <select name="receiptTheme" value={form.receiptTheme} onChange={handleChange}>
              <option value="modern">Modern</option>
              <option value="classic">Classic 🔒</option>
              <option value="minimal">Minimal 🔒</option>
              <option value="premium">Premium 🔒</option>
            </select>

            <textarea
              name="receiptFooter"
              value={form.receiptFooter}
              onChange={handleChange}
              rows={3}
            />

            <input type="file" onChange={handleLogo} />
          </div>
        )}

        {/* BILLING */}
        {activeTab === "billing" && (
          <div className="space-y-6">

            {/* CURRENT PLAN */}
            <div className="bg-black text-white rounded-2xl p-6">
              <p className="text-sm opacity-80">Current Plan</p>
              <h2 className="text-2xl font-bold capitalize">
                {business?.plan}
              </h2>

              {business?.subscription?.expiresAt && (
                <p className="text-sm mt-2 opacity-80">
                  Expires:{" "}
                  {new Date(
                    business.subscription.expiresAt
                  ).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* PLANS */}
            <div className="grid md:grid-cols-3 gap-4">

              {/* FREE */}
              <div className="border rounded-2xl p-5">
                <h3 className="font-bold text-lg">Free</h3>
                <p className="text-2xl font-bold mt-2">₦0</p>

                <ul className="mt-4 text-sm space-y-2">
                  <li>✔ 10 Products</li>
                  <li>✔ Basic POS</li>
                  <li>✔ Manual receipts</li>
                </ul>

                {business?.plan === "free" && (
                  <p className="mt-4 text-xs text-gray-500">
                    Current plan
                  </p>
                )}
              </div>

              {/* MONTHLY */}
              <div className="border-2 border-black rounded-2xl p-5">
                <h3 className="font-bold text-lg">Pro Monthly</h3>
                <p className="text-2xl font-bold mt-2">₦15,000</p>

                <ul className="mt-4 text-sm space-y-2">
                  <li>✔ Unlimited products</li>
                  <li>✔ WhatsApp receipts</li>
                  <li>✔ Branding</li>
                </ul>

                {!isPro && (
                  <button
                    type="button"
                    onClick={() => handleUpgrade("monthly")}
                    className="mt-5 w-full bg-black text-white py-2 rounded-lg"
                  >
                    Upgrade Monthly
                  </button>
                )}
              </div>

              {/* YEARLY */}
              <div className="border-2 border-green-600 rounded-2xl p-5 relative">

                <span className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  Save ₦30,000
                </span>

                <h3 className="font-bold text-lg">Pro Yearly</h3>
                <p className="text-2xl font-bold mt-2">₦150,000</p>

                <p className="text-xs text-gray-500">
                  ₦12,500 / month
                </p>

                <ul className="mt-4 text-sm space-y-2">
                  <li>✔ Everything in Monthly</li>
                  <li>✔ 2 Months Free</li>
                </ul>

                {!isPro && (
                  <button
                    type="button"
                    onClick={() => handleUpgrade("yearly")}
                    className="mt-5 w-full bg-green-600 text-white py-2 rounded-lg"
                  >
                    Upgrade Yearly 🚀
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button className="primary-button min-w-[200px]">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </form>
    </section>
  );
};

export default Settings;