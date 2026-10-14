import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { saveShopSession, shopRequest } from "../api/shop.js";
import LocationFields from "../components/LocationFields.jsx";

const ShopAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [deliveryAddress, setDeliveryAddress] = useState({
    addressLine: "",
    countryCode: "NG",
    state: "",
    localGovernment: "",
    city: "",
    nearestBusStop: "",
    deliveryNote: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = searchParams.get("next");
  const destination = next?.startsWith("/shop/") ? next : "/shop/orders";

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register" && (!deliveryAddress.addressLine.trim() || !deliveryAddress.city.trim() ||
        !deliveryAddress.countryCode || !deliveryAddress.state ||
        (deliveryAddress.countryCode === "NG" && !deliveryAddress.localGovernment))) {
        setError("Complete the street address, country, state, local government area (for Nigeria), and city or town.");
        setBusy(false);
        return;
      }
      const session = await shopRequest(mode === "register" ? "/customers/register" : "/customers/login", {
        method: "POST",
        body: JSON.stringify(mode === "register" ? {
          ...form,
          deliveryAddress: {
            ...deliveryAddress,
            label: "Home",
            recipientName: form.name,
            phone: form.phone
          }
        } : form)
      });
      saveShopSession(session);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not complete account request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-10 px-5 py-12 md:grid-cols-2 sm:px-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Your Marthington account</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{mode === "register" ? "Create your shopper account" : "Welcome back"}</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Save delivery addresses, check out securely, and follow orders managed by Marthington.
        </p>
        <Link to="/shop" className="mt-6 inline-block text-sm font-semibold text-emerald-700">← Continue shopping</Link>
      </div>
      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          {["login", "register"].map((item) => (
            <button key={item} type="button" onClick={() => { setMode(item); setError(""); }} className={`rounded-lg py-2 text-sm font-bold capitalize ${mode === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{item === "register" ? "Create account" : "Sign in"}</button>
          ))}
        </div>
        {error && <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <div className="grid gap-4">
          {mode === "register" && (
            <>
              <label className="grid gap-1 text-sm font-semibold">Full name<input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold">WhatsApp phone number<input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" /><span className="text-xs font-normal text-slate-500">We’ll use this number for delivery coordination.</span></label>
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                <div>
                  <h2 className="text-base font-bold">Your delivery information</h2>
                  <p className="mt-1 text-xs font-normal text-slate-500">Save your first delivery address now. You can add or change addresses at checkout.</p>
                </div>
                <label className="grid gap-1 text-sm font-semibold">Street address<input required autoComplete="address-line1" value={deliveryAddress.addressLine} onChange={(event) => setDeliveryAddress({ ...deliveryAddress, addressLine: event.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="House number and street" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <LocationFields value={deliveryAddress} onChange={setDeliveryAddress} />
                </div>
                <label className="grid gap-1 text-sm font-semibold">Delivery instructions (optional)<textarea value={deliveryAddress.deliveryNote} onChange={(event) => setDeliveryAddress({ ...deliveryAddress, deliveryNote: event.target.value })} rows={2} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="Gate details or other directions" /></label>
              </div>
            </>
          )}
          <label className="grid gap-1 text-sm font-semibold">Email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold">Password<input required minLength={8} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 font-normal" />{mode === "register" && <span className="text-xs font-normal text-slate-500">Use at least 8 characters.</span>}</label>
          <button disabled={busy} className="mt-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}</button>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">This shopper account is separate from business-owner accounts used to sign into the BMS.</p>
      </form>
    </main>
  );
};

export default ShopAccount;
