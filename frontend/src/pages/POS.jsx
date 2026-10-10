import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { getServices } from "../api/services.js";
import { getBranches, getBranchInventory } from "../api/branches.js";
import { getCustomers } from "../api/customers.js";
import { formatCurrency } from "../utils/formatters.js";
import { buildCustomerDisplayUrl, resolveCustomerDisplayTitle } from "../utils/customerDisplay.js";
import { useAuth } from "../context/AuthContext.jsx";

const formatDisplayText = (value = "") => {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (normalized === "b luethoot") return "Bluetooth Mouse";

  return raw
    .split(" ")
    .map((word) => {
      const lowered = word.toLowerCase();
      if (["of", "and", "for", "the", "in", "to", "a", "an", "on", "at", "by"].includes(lowered)) {
        return lowered;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

const POS = () => {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const userBranchId = user?.branch?._id || user?.branch || "";
  
  // ====================================
  // REFS
  // ====================================
  const debounceTimer = useRef(null);
  const bc = useRef(null);
  const isInitialMount = useRef(true);
  const customersLoaded = useRef(false);

  // ====================================
  // STATE MANAGEMENT
  // ====================================
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [search, setSearch] = useState("");
  const [productSort, setProductSort] = useState("added");
  const [activeTab, setActiveTab] = useState("products");
  const [pulseId, setPulseId] = useState(null);
  const [pulseType, setPulseType] = useState("product");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(userBranchId);
  const [branchInventory, setBranchInventory] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    setSelectedBranch(userBranchId || "");
  }, [userBranchId]);

  const [customer, setCustomer] = useState({ name: "", phone: "", notes: "" });
  const [autoSend, setAutoSend] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");

  const handleCustomerNameChange = (value) => {
    const typed = value.trim();
    setCustomer((prev) => ({ ...prev, name: value }));
    if (!typed) return;

    const exactMatch = customers.find((c) => c.name && c.name.toLowerCase() === typed.toLowerCase());
    if (exactMatch) {
      setCustomer((prev) => ({ ...prev, name: exactMatch.name, phone: exactMatch.phone || prev.phone || "" }));
    }
  };

  const isPro = business?.subscription?.status === "active";
  const canOverride = user?.role === "owner" || user?.role === "super_admin" || user?.permissions?.canOverridePrice;

  const loadCustomers = useCallback(async () => {
    if (customersLoaded.current) return;
    customersLoaded.current = true;

    try {
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : (data?.customers || []));
    } catch (err) {
      customersLoaded.current = false;
      console.error("Customer list load failed", err);
    }
  }, []);

  // ====================================
  // COMPUTED
  // ====================================
  const total = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0)
  , [cart]);

  const branchInventoryMap = useMemo(
    () => new Map((branchInventory || []).map((item) => [item.product?._id, item])),
    [branchInventory]
  );

  // ====================================
  // SYNC LOGIC (BroadcastChannel)
  // ====================================
  const syncToCustomerDisplay = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      if (bc.current) {
        bc.current.postMessage({
          type: "UPDATE_CART",
          businessName: business?.name,
          customerDisplayMessage: business?.customerDisplayMessage || resolveCustomerDisplayTitle(business?.name, ""),
          items: cart.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.sellingPrice,
            subtotal: i.quantity * i.sellingPrice
          })),
          total: total,
          customerName: customer.name,
          customerNotes: customer.notes
        });
      }
    }, 400); 
  }, [cart, total, customer.name, customer.notes, business?.name]);

  // Handle Initial Channel Setup
  useEffect(() => {
    bc.current = new BroadcastChannel('marthington_customer_display');

    const handleSyncRequest = (event) => {
      if (event.data.type === "REQUEST_SYNC") {
        syncToCustomerDisplay();
      }
    };

    bc.current.addEventListener("message", handleSyncRequest);

    return () => {
      if (bc.current) {
        bc.current.removeEventListener("message", handleSyncRequest);
        bc.current.close();
      }
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [syncToCustomerDisplay]);

  // Trigger sync when cart/customer changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      syncToCustomerDisplay();
    }
  }, [cart, total, customer.name, customer.notes, syncToCustomerDisplay]);

  // ====================================
  // DATA LOADING
  // ====================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const prodRes = await request("/products?limit=500");
        const cleanProducts = Array.isArray(prodRes)
          ? prodRes
          : (prodRes?.products || prodRes?.data?.products || []);
        setProducts(cleanProducts);
      } catch (err) {
        console.error("POS Load Error:", err);
        setUpgradeMsg("Failed to load inventory.");
        setProducts([]);
      } finally {
        setLoading(false);
      }

      const [servicesResult, branchesResult] = await Promise.allSettled([
        getServices(),
        getBranches()
      ]);

      if (servicesResult.status === "fulfilled") {
        const data = servicesResult.value;
        setServices(Array.isArray(data) ? data : (data?.services || []));
      }

      if (branchesResult.status === "fulfilled") {
        const data = branchesResult.value;
        const branchList = Array.isArray(data) ? data : [];
        setBranches(branchList);

        if (!userBranchId || !branchList.some((branch) => branch._id === userBranchId)) {
          setSelectedBranch("");
        }
      }
    };
    loadData();
  }, [isPro]);

useEffect(() => {
  const loadBranchInventory = async () => {
    if (!selectedBranch) {
      setBranchInventory([]);
      return;
    }

    try {
      const data = await getBranchInventory(selectedBranch);
      setBranchInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Branch inventory load failed", err);
      setBranchInventory([]);
    }
  };

  loadBranchInventory();
}, [selectedBranch]);

  // 🔥 LISTEN FOR INVENTORY UPDATES FROM EXPENSE APPROVAL
  useEffect(() => {
    if (!window.BroadcastChannel) return;
    
    const channel = new BroadcastChannel("inventory-updates");
    const handleInventoryUpdate = async (event) => {
      if (event.data?.type === "inventory-changed") {
        console.log("📦 POS: Inventory changed, refreshing branch inventory...");
        if (selectedBranch) {
          try {
            const data = await getBranchInventory(selectedBranch);
            setBranchInventory(Array.isArray(data) ? data : []);
          } catch (err) {
            console.error("Failed to refresh POS inventory", err);
          }
        }
      }
    };
    
    channel.addEventListener("message", handleInventoryUpdate);
    return () => {
      channel.removeEventListener("message", handleInventoryUpdate);
      channel.close();
    };
  }, [selectedBranch]);
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    const keyword = search.toLowerCase();

    // When a branch is selected, only show products that have been
    // imported into that branch. If none exist, show an empty list.
    let source = products;
    if (selectedBranch) {
      const allowed = new Set((branchInventory || []).map((it) => it?.product?._id).filter(Boolean));
      if (allowed.size > 0) {
        source = products.filter((p) => allowed.has(p._id));
      } else {
        source = [];
      }
    }

    const filtered = source.filter((p) =>
      p?.name?.toLowerCase().includes(keyword) ||
      p?.sku?.toLowerCase().includes(keyword) ||
      p?.category?.toLowerCase().includes(keyword)
    );

    if (productSort === "added") return filtered;

    const direction = productSort === "name-desc" ? -1 : 1;
    return [...filtered].sort((a, b) =>
      direction * String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }, [products, search, selectedBranch, branchInventory, productSort]);

  const filteredServices = useMemo(() => {
    const keyword = search.toLowerCase();
    return services.filter((s) =>
      s.name?.toLowerCase().includes(keyword) ||
      s.category?.toLowerCase().includes(keyword)
    );
  }, [services, search]);

  // ====================================
  // ACTIONS
  // ====================================
  const addToCart = useCallback((item, type) => {
    const selectedStock = type === "product"
      ? branchInventoryMap.get(item._id)?.quantity ?? item.stock
      : null;

    if (type === "product" && selectedStock !== null && Number(selectedStock) <= 0) {
      setUpgradeMsg(`${item.name} is out of stock in the selected branch.`);
      return;
    }

    setCart((prev) => {
      const isProduct = type === "product";
      const existingIndex = prev.findIndex(i => 
        isProduct ? i._id === item._id : i.serviceId === item._id
      );

      if (existingIndex > -1) {
        const newCart = [...prev];
        if (isProduct && selectedStock !== null && newCart[existingIndex].quantity >= selectedStock) {
          setUpgradeMsg(`Low stock alert: only ${selectedStock} ${selectedStock === 1 ? "unit" : "units"} left in the selected branch.`);
          return prev;
        }
        newCart[existingIndex].quantity += 1;
        return newCart;
      }

      if (isProduct && selectedStock !== null && selectedStock < 1) {
        setUpgradeMsg(`Low stock alert: ${item.name} is unavailable in the selected branch.`);
        return prev;
      }

      return [...prev, {
        _id: isProduct ? item._id : `service-${item._id}-${Date.now()}`,
        itemType: type,
        name: item.name,
        quantity: 1,
        sellingPrice: Number(item.sellingPrice || item.price || 0),
        serialNumber: "",
        note: "",
        ...(type === "service" && { serviceId: item._id }),
        ...(isProduct && { maxStock: selectedStock ?? item.stock })
      }];
    });

    const pulseKey = type === "product" ? item._id : `service-${item._id}`;
    setPulseType(type);
    setPulseId(pulseKey);
    window.setTimeout(() => setPulseId(null), 220);
  }, [branchInventoryMap]);

  const openCustomerDisplay = useCallback(() => {
    if (typeof window === "undefined") return;

    const displayUrl = buildCustomerDisplayUrl(window.location.href);
    const displayWindow = window.open(
      displayUrl,
      "marthington_customer_display",
      "popup=yes,noopener,noreferrer,width=1200,height=800"
    );

    if (!displayWindow) return;

    try {
      const currentLeft = Number.isFinite(window.screenLeft) ? window.screenLeft : (window.screenX ?? 0);
      const currentTop = Number.isFinite(window.screenTop) ? window.screenTop : (window.screenY ?? 0);
      const primaryWidth = window.screen?.width || window.innerWidth || 1280;
      const secondaryLeft = currentLeft >= 0
        ? currentLeft + (window.outerWidth || window.innerWidth || 1280) + 24
        : currentLeft - 1280;

      displayWindow.moveTo(Math.max(secondaryLeft, currentLeft >= 0 ? currentLeft + 40 : -2000), currentTop);
      displayWindow.resizeTo(Math.max(1200, primaryWidth), Math.max(700, window.screen?.availHeight || window.innerHeight || 768));
      displayWindow.focus();

      setTimeout(() => {
        try {
          if (displayWindow.document?.fullscreenEnabled) {
            displayWindow.document.documentElement.requestFullscreen?.().catch(() => {});
          }
        } catch (err) {
          console.warn("Customer display fullscreen request failed:", err);
        }
      }, 250);
    } catch (err) {
      console.warn("Customer display positioning failed:", err);
    }
  }, []);

  const updateQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(curr => curr.filter(i => i._id !== id));
      return;
    }
    setCart(curr => curr.map(i => i._id === id ? { ...i, quantity: newQty } : i));
  };

  const checkout = async () => {
    if (!cart.length || processing) return;
    try {
      setProcessing(true);
      const payload = {
        customerName: customer.name,
        customerPhone: customer.phone,
        notes: customer.notes,
        paymentMethod,
        paymentReference,
        branch: selectedBranch || undefined,
        items: cart.map(i => ({
          itemType: i.itemType,
          product: i.itemType === "product" ? i._id : undefined,
          name: i.name,
          quantity: i.quantity,
          sellingPrice: i.sellingPrice,
          serialNumber: i.serialNumber,
          note: i.note
        }))
      };

      const res = await request("/sales", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const salePayload = res?.sale || res?.data?.sale || res?.result || null;

      if (res?.offline) {
        if (bc.current) bc.current.postMessage({ type: "SALE_COMPLETE", receiptId: `PENDING-${res.operationId}` });
        setCart([]);
        setCustomer({ name: "", phone: "", notes: "" });
        setPaymentMethod("cash");
        setPaymentReference("");
        setUpgradeMsg("Sale saved on this device and will sync automatically when you are online.");
        return;
      }

      if (salePayload) {
        const saleId = salePayload._id || salePayload.id;
        const receiptId = salePayload.receiptId || salePayload.receipt_id;

        if (bc.current) bc.current.postMessage({ type: "SALE_COMPLETE", receiptId: receiptId || `PENDING-${saleId}` });

        if (autoSend && customer.phone && isPro) {
          const cleanPhone = customer.phone.replace(/\D/g, "").replace(/^0/, "234");
          const receiptLink = `${window.location.origin}/r/${receiptId || saleId}`;
          const msg = `🧾 *${business?.name}*\n\nHello ${customer.name || "Customer"},\n\nTotal: ${formatCurrency(total)}\nView Receipt: ${receiptLink}`;
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
        }

        setCart([]);
        setCustomer({ name: "", phone: "", notes: "" });
        setPaymentMethod("cash");
        setPaymentReference("");

        navigate(`/app/sales/${saleId}`, {
          state: {
            autoPrint: true,
            autoSend: Boolean(autoSend && customer.phone && isPro),
            phone: customer.phone || ""
          }
        });
        return;
      }

      setUpgradeMsg("Sale completed but receipt data was missing.");
    } catch (err) {
      setUpgradeMsg(err.message || "Transaction failed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-600 animate-pulse">Initializing POS System...</div>;

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-4 bg-gray-50 p-2 pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:p-4 dark:bg-slate-950">
      {/* LEFT COLUMN: INVENTORY */}
      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <label className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search products or services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border-none bg-slate-50 py-3 pl-4 pr-16 text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-400"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
              /
            </span>
          </label>
          {activeTab === "products" && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <span>Sort by</span>
              <select
                aria-label="Sort products"
                value={productSort}
                onChange={(e) => setProductSort(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="added">Added order</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
              </select>
            </label>
          )}
          <button 
            onClick={openCustomerDisplay}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Open external display"
            title="External Display"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <rect x="3" y="5" width="18" height="12" rx="2"></rect>
              <path d="M9 19h6"></path>
              <path d="M12 17v2"></path>
            </svg>
          </button>
        </div>

        <div className="relative flex w-fit rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          <span
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-200 dark:bg-slate-700"
            style={{ transform: activeTab === "products" ? "translateX(0%)" : "translateX(100%)" }}
          />
          {['products', 'services'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative z-10 rounded-xl px-8 py-2 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid max-h-[calc(100vh-180px)] grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === "products" ? (
            filteredProducts.map(p => {
              const pulseActive = pulseId === p._id && pulseType === "product";
              return (
                <div 
                  key={p._id} 
                  onClick={() => addToCart(p, "product")}
                  className={`pos-card ${pulseActive ? "card-pulse" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDisplayText(p.name)}</h3>
                      <span className={`stock-badge ${(Number(branchInventoryMap.get(p._id)?.quantity ?? p.stock) <= 5) ? "stock-warning" : ""}`}>
                        {Number(branchInventoryMap.get(p._id)?.quantity ?? p.stock)} left
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {formatDisplayText(p.category || "General")}
                    </p>
                    {selectedBranch ? (
                      <p className={`mt-2 text-[11px] ${Number(branchInventoryMap.get(p._id)?.quantity ?? 0) <= 0 ? "text-rose-600 dark:text-rose-400" : Number(branchInventoryMap.get(p._id)?.quantity ?? 0) <= 5 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                        {Number(branchInventoryMap.get(p._id)?.quantity ?? 0) <= 0
                          ? "Out of stock in selected branch"
                          : Number(branchInventoryMap.get(p._id)?.quantity ?? 0) <= 5
                            ? `Low stock in selected branch: ${branchInventoryMap.get(p._id)?.quantity ?? 0} left`
                            : `Branch stock: ${branchInventoryMap.get(p._id)?.quantity ?? 0}`}
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Head office stock: {p.stock ?? 0}
                      </p>
                    )}
                  </div>
                  <span className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm">
                    {formatCurrency(p.sellingPrice || p.price)}
                  </span>
                </div>
              );
            })
          ) : (
            filteredServices.map(s => {
              const pulseActive = pulseId === `service-${s._id}` && pulseType === "service";
              return (
                <div 
                  key={s._id} 
                  onClick={() => addToCart(s, "service")}
                  className={`pos-card pos-card-service ${pulseActive ? "card-pulse" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDisplayText(s.name)}</h3>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {formatDisplayText(s.category || "General")}
                    </p>
                  </div>
                  <span className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm">
                    {formatCurrency(s.price)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: CART */}
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) setCartOpen(false);
        }}
        className={cartOpen
          ? "fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 pt-16 lg:sticky lg:top-4 lg:block lg:h-[calc(100dvh-2rem)] lg:overflow-visible lg:bg-transparent lg:p-0"
          : "hidden lg:sticky lg:top-4 lg:block lg:h-[calc(100dvh-2rem)]"}
      >
        {selectedBranch && branchInventory.length === 0 && (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            No inventory has been imported for the selected branch yet. Import stock before selling products from this location.
          </div>
        )}
        <div
          role={cartOpen ? "dialog" : undefined}
          aria-modal={cartOpen ? "true" : undefined}
          aria-label={cartOpen ? "Cart checkout" : undefined}
          onClick={(event) => event.stopPropagation()}
          className="flex max-h-[calc(100dvh-5rem)] min-h-0 w-full max-w-xl flex-col rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 lg:h-full lg:max-h-none lg:w-auto lg:max-w-none"
        >
          <div className="mb-6 flex shrink-0 items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Cart</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCart([])} className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">Clear</button>
              <button onClick={() => setCartOpen(false)} className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 lg:hidden dark:bg-slate-800 dark:text-slate-300">Close</button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <div className="mb-6 space-y-3 pr-1">
              {cart.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-100 py-10 text-center dark:border-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300 dark:text-slate-500">Cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="cart-item rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDisplayText(item.name)}</span>
                      <span className="ml-2 text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(item.quantity * item.sellingPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="cart-stepper flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-slate-600 dark:bg-slate-700">
                        <button onClick={() => updateQty(item._id, item.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-xl font-black text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-600 dark:hover:text-white">-</button>
                        <span className="w-4 text-center text-xs font-black text-slate-700 dark:text-slate-200">{item.quantity}</span>
                        <button onClick={() => updateQty(item._id, item.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-xl font-black text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-600 dark:hover:text-white">+</button>
                      </div>

                      {canOverride && (
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) => {
                            const newPrice = Number(e.target.value);
                            setCart(c => c.map(i => i._id === item._id ? {...i, sellingPrice: newPrice} : i));
                          }}
                          className="w-20 rounded-xl border border-slate-200 bg-white p-1 text-right text-xs font-black text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        value={item.serialNumber}
                        onChange={(event) => setCart((current) => current.map((cartItem) => (
                          cartItem._id === item._id ? { ...cartItem, serialNumber: event.target.value } : cartItem
                        )))}
                        placeholder="Serial number (optional)"
                        aria-label={`${item.name} serial number`}
                        className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                      <input
                        value={item.note}
                        onChange={(event) => setCart((current) => current.map((cartItem) => (
                          cartItem._id === item._id ? { ...cartItem, note: event.target.value } : cartItem
                        )))}
                        placeholder="Item note (optional)"
                        aria-label={`${item.name} note`}
                        className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-dashed border-slate-200 pt-4 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-2">
              <input 
                list="customer-list"
                placeholder="Client Name"
                value={customer.name}
                onFocus={loadCustomers}
                onChange={e => handleCustomerNameChange(e.target.value)}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700 focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
              <datalist id="customer-list">
                {customers.map((customerOption) => (
                  <option key={customerOption._id} value={customerOption.name} />
                ))}
              </datalist>
              <input 
                placeholder="WhatsApp"
                value={customer.phone}
                onChange={e => setCustomer({...customer, phone: e.target.value})}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700 focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
            {branches && branches.length > 0 ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700 focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Head office</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                No branches yet. <button onClick={() => navigate('/app/branches')} className="underline">Create one</button>
              </div>
            )}

            <textarea
              placeholder="Add notes (optional - will appear on receipt)"
              value={customer.notes}
              onChange={e => setCustomer({...customer, notes: e.target.value})}
              className="h-20 w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700 focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            
            <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Total Amount</span>
                <span className="text-3xl font-black tracking-tight text-slate-900">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700 focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="credit">Credit / debt</option>
                <option value="other">Other</option>
              </select>
              {paymentMethod !== "cash" && paymentMethod !== "credit" && (
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Reference (optional)"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700 focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              )}
            </div>

            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setAutoSend(prev => !prev)}
                  className={`flex h-6 w-12 items-center rounded-full border border-slate-200 p-1 transition-all ${autoSend ? "justify-end bg-slate-900" : "justify-start bg-slate-200"}`}
                  aria-label="Toggle WhatsApp receipt"
                >
                  <span className="h-4 w-4 rounded-full bg-white shadow-sm"></span>
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">WhatsApp</span>
            </div>

            {upgradeMsg && <p className="rounded-2xl bg-rose-50 p-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">{upgradeMsg}</p>}

            <button
              onClick={checkout}
              disabled={!cart.length || processing}
              className={`w-full rounded-2xl py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-all active:translate-y-[1px] ${
                processing ? "bg-slate-300" : "bg-slate-900 shadow-[0_14px_28px_rgba(15,23,42,0.16)] hover:bg-slate-800"
              }`}
            >
              {processing ? "PROCESSING..." : "CONFIRM & PRINT"}
            </button>
            </div>
          </div>
        </div>
      </div>

      {!cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed right-4 top-20 z-50 flex items-center gap-3 rounded-full bg-slate-900 px-4 py-3 text-left text-white shadow-[0_14px_32px_rgba(15,23,42,0.28)] lg:hidden"
          aria-label="Open cart"
        >
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Cart</span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-black text-slate-900">
            {cart.reduce((count, item) => count + item.quantity, 0)}
          </span>
        </button>
      )}
    </div>
  );
};

export default POS;