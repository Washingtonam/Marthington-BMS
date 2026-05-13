import { useEffect, useMemo, useState, useCallback, useRef } from "react"; // Added useRef
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { getServices } from "../api/services.js";
import { formatCurrency } from "../utils/formatters.js";
import { useAuth } from "../context/AuthContext.jsx";

// Initialize Broadcast Channel for Secondary Screen
const bc = new BroadcastChannel('marthington_customer_display');

const POS = () => {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const debounceTimer = useRef(null); // To hide live price typing

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
  const [visibleProducts, setVisibleProducts] = useState(12);

  const [customer, setCustomer] = useState({ name: "", phone: "", notes: "" });
  const [autoSend, setAutoSend] = useState(false);

  const isPro = business?.subscription?.status === "active";
  const canOverride = user?.role === "owner" || user?.role === "super_admin" || user?.permissions?.canOverridePrice;

  // ====================================
  // SECONDARY SCREEN LOGIC (The "Invisible" Filter)
  // ====================================
  const syncToCustomerDisplay = useCallback((currentCart, currentTotal) => {
    // Clear existing timer if user is still typing
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Set a small delay (800ms) so the customer only sees the final price, 
    // not the staff member erasing and re-typing it.
    debounceTimer.current = setTimeout(() => {
      bc.postMessage({
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
    }, 800);
  }, [business?.name, customer.name, customer.notes]);

  // Sync whenever cart or total changes
  useEffect(() => {
    syncToCustomerDisplay(cart, total);
  }, [cart, total, syncToCustomerDisplay]);

  const openCustomerDisplay = () => {
    // This opens the new route in a popup window for the second monitor
    window.open('/app/customer-view', 'CustomerWindow', 'width=800,height=600');
  };

  // ====================================
  // DATA INITIALIZATION
  // ====================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productData, serviceData] = await Promise.all([
          request("/products?page=1&limit=200"),
          getServices({ activeOnly: true })
        ]);
        setProducts(Array.isArray(productData) ? productData : productData.products || []);
        const safeServices = Array.isArray(serviceData) ? serviceData : serviceData.services || [];
        setServices(safeServices.filter((s) => s.isActive !== false));
      } catch (err) {
        setError("System Error: Unable to sync inventory.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ====================================
  // SEARCH & FILTER LOGIC
  // ====================================
  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase();
    return products
      .filter((p) => 
        p.name?.toLowerCase().includes(keyword) || 
        p.sku?.toLowerCase().includes(keyword) ||
        p.category?.toLowerCase().includes(keyword)
      )
      .slice(0, visibleProducts);
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

  const total = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0)
  , [cart]);

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
        autoSend,
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
        // Notify Customer Display of Success
        bc.postMessage({ type: "SALE_COMPLETE", receiptId: res.sale.receiptId });

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

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-2 lg:p-4">
      {/* LEFT COLUMN */}
      <div className="flex-1 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border flex gap-4">
          <input
            type="text"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500"
          />
          {/* Secondary Screen Trigger */}
          <button 
            onClick={openCustomerDisplay}
            className="px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors"
            title="Open Customer Display"
          >
            🖥️ Screen 2
          </button>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          {["products", "services"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg capitalize transition-all ${
                activeTab === tab ? "bg-white shadow-sm font-bold" : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
          {activeTab === "products" ? (
            filteredProducts.map(p => (
              <div 
                key={p._id} 
                onClick={() => addToCart(p, "product")}
                className="bg-white p-4 rounded-xl border hover:border-blue-500 cursor-pointer transition-all flex justify-between items-center group"
              >
                <div>
                  <h3 className="font-semibold group-hover:text-blue-600">{p.name}</h3>
                  <p className="text-xs text-gray-400">{p.category || "No Category"} • Stock: {p.stock}</p>
                </div>
                <span className="font-bold">{formatCurrency(p.sellingPrice || p.price)}</span>
              </div>
            ))
          ) : (
            filteredServices.map(s => (
              <div 
                key={s._id} 
                onClick={() => addToCart(s, "service")}
                className="bg-white p-4 rounded-xl border hover:border-green-500 cursor-pointer flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-gray-400">Fixed Service</p>
                </div>
                <span className="font-bold">{formatCurrency(s.price)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: CART */}
      <div className="xl:w-[400px] space-y-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border sticky top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Current Order</h2>
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">Clear</button>
          </div>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-4">
            {cart.length === 0 && <p className="text-center py-10 text-gray-400">Cart is empty</p>}
            {cart.map(item => (
              <div key={item._id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm line-clamp-1">{item.name}</span>
                  <span className="text-sm font-bold">{formatCurrency(item.quantity * item.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-white border rounded-lg px-2 py-1">
                    <button onClick={() => updateQty(item._id, item.quantity - 1)} className="hover:text-blue-600">-</button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item._id, item.quantity + 1)} className="hover:text-blue-600">+</button>
                  </div>
                  {canOverride && (
                    <input 
                      type="number" 
                      value={item.sellingPrice}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        setCart(c => c.map(i => i._id === item._id ? {...i, sellingPrice: newPrice} : i));
                      }}
                      className="w-20 text-right text-xs border-none bg-transparent focus:ring-0 font-semibold text-blue-600"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t space-y-3">
            <input 
              placeholder="Customer Name"
              value={customer.name}
              onChange={e => setCustomer({...customer, name: e.target.value})}
              className="w-full text-sm border-gray-200 rounded-lg"
            />
            <input 
              placeholder="WhatsApp Number"
              value={customer.phone}
              onChange={e => setCustomer({...customer, phone: e.target.value})}
              className="w-full text-sm border-gray-200 rounded-lg"
            />
            <input 
              placeholder="Notes (e.g. Special discounts, serial numbers)"
              value={customer.notes}
              onChange={e => setCustomer({...customer, notes: e.target.value})}
              className="w-full text-sm border-gray-200 rounded-lg mb-2" 
            />
            
            <div className="flex justify-between text-xl font-black pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <button
              onClick={checkout}
              disabled={!cart.length || processing}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                processing ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100"
              }`}
            >
              {processing ? "Syncing..." : "Complete Transaction"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;