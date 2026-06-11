import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { getServices } from "../api/services.js";
import { formatCurrency } from "../utils/formatters.js";
import { useAuth } from "../context/AuthContext.jsx";

const POS = () => {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  
  // ====================================
  // REFS
  // ====================================
  const debounceTimer = useRef(null);
  const bc = useRef(null);
  const isInitialMount = useRef(true);

  // ====================================
  // STATE MANAGEMENT
  // ====================================
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [visibleProducts, setVisibleProducts] = useState(20);

  const [customer, setCustomer] = useState({ name: "", phone: "", notes: "" });
  const [autoSend, setAutoSend] = useState(false);

  const isPro = business?.subscription?.status === "active";
  const canOverride = user?.role === "owner" || user?.role === "super_admin" || user?.permissions?.canOverridePrice;

  // ====================================
  // COMPUTED
  // ====================================
  const total = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0)
  , [cart]);

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
      try {
        setLoading(true);
        const limit = isPro ? 1000 : 20;
        const [prodRes, servRes] = await Promise.all([
          request(`/products?limit=${limit}`),
          getServices()
        ]);

        // Ensure we are setting arrays.
        // If the API returns { products: [...] }, use prodRes.products.
        const cleanProducts = Array.isArray(prodRes)
          ? prodRes
          : (prodRes?.products || prodRes?.data?.products || []);
        const cleanServices = Array.isArray(servRes) ? servRes : (servRes?.services || []);

        setProducts(cleanProducts);
        setServices(cleanServices);
      } catch (err) {
        console.error("POS Load Error:", err);
        setUpgradeMsg("Failed to load inventory.");
        setProducts([]); // Fallback to empty array to prevent .filter crash
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isPro]);

  const openCustomerDisplay = () => {
    window.open('/app/customer-view', 'CustomerWindow', 'width=1000,height=700');
  };

  // ====================================
  // SEARCH & FILTER
  // ====================================
  const filteredProducts = useMemo(() => {
    // Safety check: if products is somehow not an array, return empty
    if (!Array.isArray(products)) return [];

    const keyword = search.toLowerCase();
    const base = products.filter((p) => 
        p?.name?.toLowerCase().includes(keyword) || 
        p?.sku?.toLowerCase().includes(keyword) ||
        p?.category?.toLowerCase().includes(keyword)
    );

    if (isPro) {
      return base;
    }

    return base.slice(0, visibleProducts);
  }, [products, search, visibleProducts, isPro]);

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
    setCart((prev) => {
      const isProduct = type === "product";
      const existingIndex = prev.findIndex(i => 
        isProduct ? i._id === item._id : i.serviceId === item._id
      );

      if (existingIndex > -1) {
        const newCart = [...prev];
        if (isProduct && newCart[existingIndex].quantity >= item.stock) {
          setUpgradeMsg(`Limited Stock: Only ${item.stock} available.`);
          return prev;
        }
        newCart[existingIndex].quantity += 1;
        return newCart;
      }

      return [...prev, {
        _id: isProduct ? item._id : `service-${item._id}-${Date.now()}`,
        itemType: type,
        name: item.name,
        quantity: 1,
        sellingPrice: Number(item.sellingPrice || item.price || 0),
        ...(type === "service" && { serviceId: item._id }),
        ...(isProduct && { maxStock: item.stock })
      }];
    });
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
        items: cart.map(i => ({
          itemType: i.itemType,
          product: i.itemType === "product" ? i._id : undefined,
          name: i.name,
          quantity: i.quantity,
          sellingPrice: i.sellingPrice
        }))
      };

      const res = await request("/sales", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res?.sale) {
        if (bc.current) bc.current.postMessage({ type: "SALE_COMPLETE", receiptId: res.sale.receiptId });

        if (autoSend && customer.phone && isPro) {
          const cleanPhone = customer.phone.replace(/\D/g, "").replace(/^0/, "234");
          const receiptLink = `${window.location.origin}/r/${res.sale.receiptId}`;
          const msg = `🧾 *${business?.name}*\n\nHello ${customer.name || "Customer"},\n\nTotal: ${formatCurrency(total)}\nView Receipt: ${receiptLink}`;
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
        }
        
        setCart([]);
        setCustomer({ name: "", phone: "", notes: "" });
        navigate(`/app/sales/${res.sale._id}`);
      }
    } catch (err) {
      setUpgradeMsg(err.message || "Transaction failed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-600 animate-pulse">Initializing POS System...</div>;

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-2 lg:p-4 bg-gray-50 min-h-screen">
      {/* LEFT COLUMN: INVENTORY */}
      <div className="flex-1 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search products or services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={openCustomerDisplay}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
          >
            🖥️ External Display
          </button>
        </div>

        <div className="flex bg-gray-200 p-1 rounded-xl w-fit">
          {["products", "services"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2 rounded-lg capitalize transition-all ${
                activeTab === tab ? "bg-white shadow-sm font-bold text-blue-600" : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === "products" ? (
            filteredProducts.map(p => (
              <div 
                key={p._id} 
                onClick={() => addToCart(p, "product")}
                className="bg-white p-4 rounded-xl border border-transparent hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-gray-800 group-hover:text-blue-600 truncate max-w-[150px]">{p.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{p.category || "General"} • {p.stock} Left</p>
                </div>
                <span className="font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{formatCurrency(p.sellingPrice || p.price)}</span>
              </div>
            ))
          ) : (
            filteredServices.map(s => (
              <div 
                key={s._id} 
                onClick={() => addToCart(s, "service")}
                className="bg-white p-4 rounded-xl border border-transparent hover:border-green-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
              >
                <div>
                  <h3 className="font-bold text-sm group-hover:text-green-600">{s.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Service</p>
                </div>
                <span className="font-black text-green-700 bg-green-50 px-2 py-1 rounded-lg">{formatCurrency(s.price)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: CART */}
      <div className="xl:w-[400px]">
        <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 sticky top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-800">Cart</h2>
            <button onClick={() => setCart([])} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase tracking-tighter">Clear</button>
          </div>

          <div className="space-y-3 max-h-[35vh] overflow-y-auto mb-6 pr-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                <p className="text-gray-300 text-xs font-bold uppercase tracking-widest">Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item._id} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-xs text-gray-700 line-clamp-1 flex-1">{item.name}</span>
                    <span className="text-sm font-black text-blue-600 ml-2">{formatCurrency(item.quantity * item.sellingPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 bg-white border rounded-xl px-2 py-1 shadow-sm">
                      <button onClick={() => updateQty(item._id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center font-black hover:text-red-500">-</button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item._id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center font-black hover:text-blue-500">+</button>
                    </div>
                    
                    {canOverride && (
                      <input 
                        type="number" 
                        value={item.sellingPrice}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value);
                          setCart(c => c.map(i => i._id === item._id ? {...i, sellingPrice: newPrice} : i));
                        }}
                        className="w-20 text-right text-xs border border-gray-200 rounded-lg p-1 bg-white font-black text-blue-600"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-dashed space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input 
                placeholder="Client Name"
                value={customer.name}
                onChange={e => setCustomer({...customer, name: e.target.value})}
                className="text-xs font-bold border-gray-100 rounded-xl focus:ring-blue-500 bg-gray-50 p-3"
              />
              <input 
                placeholder="WhatsApp"
                value={customer.phone}
                onChange={e => setCustomer({...customer, phone: e.target.value})}
                className="text-xs font-bold border-gray-100 rounded-xl focus:ring-blue-500 bg-gray-50 p-3"
              />
            </div>

            <textarea
              placeholder="Add notes (optional - will appear on receipt)"
              value={customer.notes}
              onChange={e => setCustomer({...customer, notes: e.target.value})}
              className="w-full text-xs font-semibold border border-gray-100 rounded-xl focus:ring-blue-500 bg-gray-50 p-3 resize-none h-20"
            />
            
            <div className="flex justify-between items-end py-2">
                <div className="flex flex-col">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Amount</span>
                    <span className="text-3xl font-black text-gray-900">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <input 
                        type="checkbox" 
                        checked={autoSend} 
                        onChange={e => setAutoSend(e.target.checked)}
                        className="rounded-full text-blue-600"
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase">WhatsApp</span>
                </div>
            </div>

            {upgradeMsg && <p className="text-center text-[10px] font-black text-red-500 bg-red-50 p-2 rounded-xl uppercase">{upgradeMsg}</p>}

            <button
              onClick={checkout}
              disabled={!cart.length || processing}
              className={`w-full py-4 rounded-2xl font-black text-white transition-all transform active:scale-95 ${
                processing ? "bg-gray-300" : "bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200"
              }`}
            >
              {processing ? "PROCESSING..." : "CONFIRM & PRINT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;