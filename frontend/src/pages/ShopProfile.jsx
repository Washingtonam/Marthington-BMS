import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LocationFields from "../components/LocationFields.jsx";
import { clearShopSession, getShopSession, shopRequest } from "../api/shop.js";

const emptyAddress = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine: "",
  countryCode: "NG",
  state: "",
  localGovernment: "",
  city: "",
  nearestBusStop: "",
  deliveryNote: ""
};

const ShopProfile = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(getShopSession().customer);
  const [form, setForm] = useState({ name: "", email: "", phone: "", currentPassword: "", newPassword: "" });
  const [address, setAddress] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    shopRequest("/customers/me")
      .then(({ customer: current }) => {
        if (!active) return;
        setCustomer(current);
        setForm((previous) => ({ ...previous, name: current.name || "", email: current.email || "", phone: current.phone || "" }));
        localStorage.setItem("marthington_shop_customer", JSON.stringify(current));
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) {
          clearShopSession();
          navigate("/shop/account?next=%2Fshop%2Fprofile", { replace: true });
          return;
        }
        setError(requestError.message || "Could not load your profile.");
      });
    return () => { active = false; };
  }, [navigate]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      if (form.newPassword) {
        payload.append("currentPassword", form.currentPassword);
        payload.append("newPassword", form.newPassword);
      }
      if (profilePicture) payload.append("profilePicture", profilePicture);
      const result = await shopRequest("/customers/me", { method: "PATCH", body: payload });
      setCustomer(result.customer);
      localStorage.setItem("marthington_shop_customer", JSON.stringify(result.customer));
      setProfilePicture(null);
      setForm((previous) => ({ ...previous, currentPassword: "", newPassword: "" }));
      setMessage("Your profile has been updated.");
    } catch (requestError) {
      setError(requestError.message || "Could not update your profile.");
    } finally {
      setBusy(false);
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const path = editingAddressId ? `/customers/addresses/${editingAddressId}` : "/customers/addresses";
      const result = await shopRequest(path, {
        method: editingAddressId ? "PATCH" : "POST",
        body: JSON.stringify(address)
      });
      setCustomer(result.customer);
      localStorage.setItem("marthington_shop_customer", JSON.stringify(result.customer));
      setAddress(emptyAddress);
      setEditingAddressId("");
      setMessage(editingAddressId ? "Delivery address updated." : "Delivery address added.");
    } catch (requestError) {
      setError(requestError.message || "Could not save delivery address.");
    } finally {
      setBusy(false);
    }
  };

  const editAddress = (item) => {
    setEditingAddressId(item._id);
    setAddress({ ...emptyAddress, ...item });
    setError("");
    setMessage("");
  };

  const removeAddress = async (addressId) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await shopRequest(`/customers/addresses/${addressId}`, { method: "DELETE" });
      setCustomer(result.customer);
      localStorage.setItem("marthington_shop_customer", JSON.stringify(result.customer));
      if (editingAddressId === addressId) {
        setEditingAddressId("");
        setAddress(emptyAddress);
      }
      setMessage("Delivery address removed.");
    } catch (requestError) {
      setError(requestError.message || "Could not remove delivery address.");
    } finally {
      setBusy(false);
    }
  };

  if (!getShopSession().token) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="text-3xl font-black text-slate-900">Sign in to manage your profile</h1>
        <Link to="/shop/account?next=%2Fshop%2Fprofile" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white">Sign in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8">
      <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Shopper account</p>
        <h1 className="mt-3 text-3xl font-black">Profile & settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Keep your contact information and delivery details ready for a smoother checkout.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5">
          {customer?.avatar
            ? <img src={customer.avatar} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-emerald-100" />
            : <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-2xl font-black uppercase text-emerald-800">{String(customer?.name || "M").slice(0, 1)}</span>}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Personal information</h2>
            <p className="mt-1 text-xs text-slate-500">Update your name, contact details, profile photo, or password.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">Full name
            <input required maxLength={120} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">Email address
            <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">Phone / WhatsApp
            <input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">Profile picture
            <input type="file" accept="image/*" onChange={(event) => setProfilePicture(event.target.files?.[0] || null)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-bold file:text-emerald-800" />
            <span className="font-normal text-slate-400">Images are uploaded securely. Maximum file size: 5 MB.</span>
          </label>
          <div className="sm:col-span-2">
            <h3 className="text-sm font-extrabold text-slate-900">Change password</h3>
            <p className="mt-1 text-xs text-slate-500">Leave these fields empty to keep your current password.</p>
          </div>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">Current password
            <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">New password
            <input type="password" minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">{busy ? "Saving..." : "Save profile"}</button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-slate-100 pb-5">
          <h2 className="text-lg font-extrabold text-slate-900">Delivery addresses</h2>
          <p className="mt-1 text-xs text-slate-500">Save trusted destinations for faster checkout.</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {(customer?.addresses || []).length ? customer.addresses.map((item) => (
              <article key={item._id} className={`rounded-2xl border p-4 ${editingAddressId === item._id ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{item.label || "Delivery address"}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.recipientName} · {item.phone}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.addressLine}, {item.city}{item.localGovernment ? `, ${item.localGovernment} LGA` : ""}, {item.state}, {item.country || item.countryCode}</p>
                    {item.deliveryNote && <p className="mt-2 text-xs text-slate-500">{item.deliveryNote}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => editAddress(item)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                    <button type="button" disabled={busy} onClick={() => removeAddress(item._id)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                  </div>
                </div>
              </article>
            )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No saved delivery addresses yet.</div>}
          </div>
          <form onSubmit={saveAddress} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <h3 className="text-sm font-extrabold text-slate-900">{editingAddressId ? "Edit address" : "Add a delivery address"}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">Address label
                <input value={address.label} onChange={(event) => setAddress({ ...address, label: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">Recipient name
                <input required value={address.recipientName} onChange={(event) => setAddress({ ...address, recipientName: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">WhatsApp phone
                <input required type="tel" value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Street address
                <input required value={address.addressLine} onChange={(event) => setAddress({ ...address, addressLine: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" />
              </label>
              <LocationFields value={address} onChange={setAddress} inputClassName="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" labelClassName="grid gap-1 text-xs font-semibold text-slate-600" />
              <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Delivery instructions
                <textarea rows={2} value={address.deliveryNote} onChange={(event) => setAddress({ ...address, deliveryNote: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {editingAddressId && <button type="button" onClick={() => { setEditingAddressId(""); setAddress(emptyAddress); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Cancel edit</button>}
              <button type="submit" disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving..." : editingAddressId ? "Update address" : "Add address"}</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ShopProfile;
