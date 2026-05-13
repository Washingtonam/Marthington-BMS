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
  // REFS (Safe for Production)
  // ====================================
  const debounceTimer = useRef(null);
  const bc = useRef(null); // Moved BroadcastChannel to a Ref

  // ====================================
  // STATE MANAGEMENT
  // ====================================
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [upgradeMsg, setUpgradeMsg] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [visibleProducts, setVisibleProducts] = useState(20);

  const [customer, setCustomer] = useState({ name: "", phone: "", notes: "" });
  const [autoSend, setAutoSend] = useState(false);

  const isPro = business?.subscription?.status === "active";
  const canOverride = user?.role === "owner" || user?.role === "super_admin" || user?.permissions?.canOverridePrice;

  // Calculate total first so it can be used in effects
  const total = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0)
  , [cart]);

  // ====================================
  // INITIALIZATION & CLEANUP
  // ====================================
  useEffect(() => {
    bc.current = new BroadcastChannel('marthington_customer_display');

    // NEW: Listen for new windows opening and send them the current cart
    const handleSyncRequest = (event) => {
      if (event.data.type === "REQUEST_SYNC") {
        // Trigger the existing sync function manually
        syncToCustomerDisplay(cart, total);
      }
    };

    bc.current.addEventListener("message", handleSyncRequest);

    const loadData = async () => {
      /* ... your existing loadData code ... */
    };
    loadData();

    return () => {
      if (bc.current) {
        bc.current.removeEventListener("message", handleSyncRequest);
        bc.current.close();
      }
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [cart, total, syncToCustomerDisplay]); // Added dependencies to ensure fresh data is sent

  // ====================================
  // SECONDARY SCREEN LOGIC
  // ====================================
  const syncToCustomerDisplay = useCallback((currentCart, currentTotal) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      if (bc.current) {
        bc.current.postMessage({
          type: "UPDATE_CART",
          businessName: business?.name,
          items: currentCart.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.sellingPrice,
            subtotal: i.quantity * i.sellingPrice
          })),
          total: currentTotal,
          customerName: customer.name,
          customerNotes: customer.notes
        });
      }
    }, 500); // Reduced delay for better responsiveness
  }, [business?.name, customer.name, customer.notes]);

  useEffect(() => {
    syncToCustomerDisplay(cart, total);
  }, [cart, total, syncToCustomerDisplay]);

  const openCustomerDisplay = () => {
    window.open('/app/customer-view', 'CustomerWindow', 'width=1000,height=700');
  };

  // ====================================
  // SEARCH & FILTER LOGIC
  // ====================================
  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase();
    if (!keyword) return products.slice(0, visibleProducts);
    return products.filter((p) => 
        p.name?.toLowerCase().includes(keyword) || 
        p.sku?.toLowerCase().includes(keyword) ||
        p.category?.toLowerCase().includes(keyword)
      ).slice(0, visibleProducts);
  }, [products, search, visibleProducts]);

  const filteredServices = useMemo(() => {
    const keyword = search.toLowerCase();
    return services.filter((s) => 
      s.name?.toLowerCase().includes(keyword) || 
      s.category?.toLowerCase().includes(keyword)
    );
  }, [services, search]);

  // ====================================
  // CART ACTIONS
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

      const newItem = {
        _id: isProduct ? item._id : `service-${item._id}-${Date.now()}`,
        itemType: type,
        name: item.name,
        quantity: 1,
        sellingPrice: Number(item.sellingPrice || item.price || 0),
        ...(type === "service" && { serviceId: item._id }),
        ...(isProduct && { maxStock: item.stock })
      };
      return [...prev, newItem];
    });
  }, []);

  const updateQty = (id, newQty) => {
    if (newQty <= 0) {
      setCart(curr => curr.filter(i => i._id !== id));
      return;
    }
    setCart(curr => curr.map(i => i._id === id ? { ...i, quantity: newQty } : i));
  };

  // ====================================
  // CHECKOUT
  // ====================================
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

  if (loading) return <div className="p-10 text-center font-bold">Loading POS System...</div>;

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-2 lg:p-4">
      {/* LEFT COLUMN: INVENTORY */}
      <div className="flex-1 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search items or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={openCustomerDisplay}
            className="px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold text-blue-600 transition-all flex items-center gap-2"
          >
            🖥️ Launch Customer View
          </button>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
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

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto pr-2">
          {activeTab === "products" ? (
            filteredProducts.map(p => (
              <div 
                key={p._id} 
                onClick={() => addToCart(p, "product")}
                className="bg-white p-4 rounded-xl border hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-sm group-hover:text-blue-600 truncate max-w-[150px]">{p.name}</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{p.category || "General"} • {p.stock} In Stock</p>
                </div>
                <span className="font-bold text-blue-700">{formatCurrency(p.sellingPrice || p.price)}</span>
              </div>
            ))
          ) : (
            filteredServices.map(s => (
              <div 
                key={s._id} 
                onClick={() => addToCart(s, "service")}
                className="bg-white p-4 rounded-xl border hover:border-green-500 hover:shadow-md cursor-pointer flex justify-between items-center group"
              >
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-green-600">{s.name}</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Service Item</p>
                </div>
                <span className="font-bold text-green-700">{formatCurrency(s.price)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: CART & CHECKOUT */}
      <div className="xl:w-[420px]">
        <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 sticky top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-800">Checkout</h2>
            <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">Reset Cart</button>
          </div>

          <div className="space-y-3 max-h-[35vh] overflow-y-auto mb-6 pr-2 custom-scrollbar">
            {cart.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-300 text-sm">Select products to begin</p>
              </div>
            )}
            {cart.map(item => (
              <div key={item._id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xs text-gray-700 line-clamp-1 flex-1">{item.name}</span>
                  <span className="text-sm font-black text-blue-600 ml-2">{formatCurrency(item.quantity * item.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-white border rounded-lg px-2 py-1 shadow-sm">
                    <button onClick={() => updateQty(item._id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center font-bold hover:text-red-500">-</button>
                    <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item._id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center font-bold hover:text-blue-500">+</button>
                  </div>
                  
                  {canOverride && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">Edit Price:</span>
                      <input 
                        type="number" 
                        value={item.sellingPrice}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value);
                          setCart(c => c.map(i => i._id === item._id ? {...i, sellingPrice: newPrice} : i));
                        }}
                        className="w-24 text-right text-xs border border-gray-200 rounded p-1 bg-white focus:ring-1 focus:ring-blue-500 font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-dashed space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input 
                placeholder="Client Name"
                value={customer.name}
                onChange={e => setCustomer({...customer, name: e.target.value})}
                className="text-sm border-gray-200 rounded-lg focus:ring-blue-500"
              />
              <input 
                placeholder="WhatsApp Number"
                value={customer.phone}
                onChange={e => setCustomer({...customer, phone: e.target.value})}
                className="text-sm border-gray-200 rounded-lg focus:ring-blue-500"
              />
            </div>
            <textarea 
              placeholder="Sale notes or serial numbers..."
              value={customer.notes}
              onChange={e => setCustomer({...customer, notes: e.target.value})}
              className="w-full text-sm border-gray-200 rounded-lg h-16 resize-none focus:ring-blue-500"
            />
            
            <div className="flex justify-between items-end py-2">
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Grand Total</span>
                    <span className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <input 
                        type="checkbox" 
                        checked={autoSend} 
                        onChange={e => setAutoSend(e.target.checked)}
                        className="rounded text-blue-600"
                    />
                    <span className="text-[10px] font-bold text-gray-500">Auto-WhatsApp</span>
                </div>
            </div>

            {upgradeMsg && <p className="text-center text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg">{upgradeMsg}</p>}

            <button
              onClick={checkout}
              disabled={!cart.length || processing}
              className={`w-full py-4 rounded-2xl font-black text-lg text-white transition-all transform active:scale-95 ${
                processing ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200"
              }`}
            >
              {processing ? "PROCESSING..." : "PAY & PRINT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;