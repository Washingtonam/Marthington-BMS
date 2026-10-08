import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getShopSession, saveShopSession, shopRequest } from "../api/shop.js";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const emptyAddress = { label: "Delivery", recipientName: "", phone: "", addressLine: "", city: "", state: "", deliveryNote: "" };

const ShopCheckout = () => {
  const navigate = useNavigate();
  const { items, subtotal } = useShopCart();
  const [customer, setCustomer] = useState(getShopSession().customer);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressFormOpen, setAddressFormOpen] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getShopSession().token) {
      navigate("/shop/account?next=%2Fshop%2Fcheckout", { replace: true });
      return;
    }
    shopRequest("/customers/me")
      .then(({ customer: current }) => {
        setCustomer(current);
        setAddresses(current.addresses || []);
        setAddressId(current.addresses?.[0]?._id || "");
        setAddressFormOpen((current.addresses || []).length === 0);
        saveShopSession({ token: getShopSession().token, customer: current });
      })
      .catch((requestError) => setError(requestError.message));
  }, [navigate]);

  const saveAddress = async () => {
    setSavingAddress(true);
    setError("");
    try {
      const result = await shopRequest(
        editingAddressId ? `/customers/addresses/${editingAddressId}` : "/customers/addresses",
        { method: editingAddressId ? "PATCH" : "POST", body: JSON.stringify(address) }
      );
      const current = result.customer;
      setCustomer(current);
      setAddresses(current.addresses || []);
      const saved = editingAddressId
        ? current.addresses?.find((item) => item._id === editingAddressId)
        : current.addresses?.[current.addresses.length - 1];
      setAddressId(saved?._id || "");
      saveShopSession({ token: getShopSession().token, customer: current });
      setAddress(emptyAddress);
      setEditingAddressId("");
      setAddressFormOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const editAddress = (saved) => {
    setAddressId(saved._id);
    setEditingAddressId(saved._id);
    setAddressFormOpen(true);
    setAddress({
      label: saved.label || "Delivery",
      recipientName: saved.recipientName || "",
      phone: saved.phone || "",
      addressLine: saved.addressLine || "",
      city: saved.city || "",
      state: saved.state || "",
      deliveryNote: saved.deliveryNote || ""
    });
  };

  const deleteAddress = async (saved) => {
    setError("");
    try {
      const result = await shopRequest(`/customers/addresses/${saved._id}`, { method: "DELETE" });
      setCustomer(result.customer);
      setAddresses(result.customer.addresses || []);
      if (addressId === saved._id) setAddressId(result.customer.addresses?.[0]?._id || "");
      if (!result.customer.addresses?.length) setAddressFormOpen(true);
      if (editingAddressId === saved._id) {
        setEditingAddressId("");
        setAddress(emptyAddress);
      }
      saveShopSession({ token: getShopSession().token, customer: result.customer });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const placeOrder = async () => {
    if (!addressId) {
      setError("Save and select a delivery address before placing your order.");
      return;
    }
    setPlacingOrder(true);
    setError("");
    try {
      const result = await shopRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId,
          items: items.map((item) => ({ productId: item.id, quantity: item.quantity, expectedPrice: Number(item.price) }))
        })
      });
      window.location.assign(result.authorizationUrl);
    } catch (requestError) {
      setError(requestError.message || "Could not place your order.");
      setPlacingOrder(false);
    }
  };

  if (!items.length) return <main className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="text-2xl font-black">Your cart is empty</h1><Link to="/shop" className="mt-5 inline-block font-semibold text-emerald-700">Return to shop</Link></main>;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl font-black">Checkout</h1>
      <p className="mt-2 text-sm text-slate-500">Signed in as {customer?.email || "your shop account"}. Delivery fees are confirmed after Marthington reviews the order.</p>
      {error && <div role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Delivery address</h2>
            {addresses.length > 0 && (
              <div className="mt-4 grid gap-3">
                {addresses.map((saved) => (
                  <div key={saved._id} className={`flex items-start gap-3 rounded-xl border p-4 ${addressId === saved._id ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200"}`}>
                    <input type="radio" name="deliveryAddress" checked={addressId === saved._id} onChange={() => { setAddressId(saved._id); setEditingAddressId(""); }} aria-label={`Deliver to ${saved.label}`} />
                    <span className="flex-1 text-sm"><strong>{saved.label} — {saved.recipientName}</strong><span className="mt-1 block text-slate-600">{saved.addressLine}, {saved.city}, {saved.state}</span><span className="block text-slate-500">{saved.phone}</span></span>
                    <button type="button" onClick={() => editAddress(saved)} className="text-xs font-semibold text-emerald-700 underline">Edit</button>
                    <button type="button" onClick={() => deleteAddress(saved)} className="text-xs font-semibold text-rose-700 underline">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <section className="mt-5 rounded-xl border border-dashed border-slate-300 p-4">
              <button type="button" onClick={() => setAddressFormOpen((open) => !open)} className="text-left text-sm font-semibold">{addressFormOpen ? "Hide address form" : editingAddressId ? "Edit selected delivery address" : "Add a delivery address"}</button>
              {addressFormOpen && <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["recipientName", "Recipient name"], ["phone", "Phone"], ["addressLine", "Street address"], ["city", "City"], ["state", "State"]
                ].map(([key, label]) => (
                  <label key={key} className={`grid gap-1 text-xs font-semibold text-slate-600 ${key === "addressLine" ? "sm:col-span-2" : ""}`}>{label}<input value={address[key]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                ))}
                <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Delivery note (optional)<textarea value={address.deliveryNote} onChange={(event) => setAddress({ ...address, deliveryNote: event.target.value })} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
              </div>}
              {addressFormOpen && <button type="button" disabled={savingAddress} onClick={saveAddress} className="mt-4 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-50">{savingAddress ? "Saving..." : editingAddressId ? "Update address" : "Save address"}</button>}
            </section>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Payment and delivery</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Pay the product subtotal securely to Marthington through Paystack. Marthington will review your order, contact suppliers, arrange delivery, then confirm the delivery fee for a separate payment.</p>
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">Order summary</h2>
          <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
            {items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.name} × {item.quantity}</span><strong>{formatCurrency(item.price * item.quantity)}</strong></div>)}
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex justify-between"><span>Products subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
            <p className="mt-2 text-xs text-slate-500">Delivery fee billed separately after confirmation.</p>
          </div>
          <button type="button" disabled={placingOrder} onClick={placeOrder} className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{placingOrder ? "Preparing secure payment..." : `Pay ${formatCurrency(subtotal)} with Paystack`}</button>
        </aside>
      </div>
    </main>
  );
};

export default ShopCheckout;
