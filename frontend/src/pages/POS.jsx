import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { getServices } from "../api/services.js";
import { formatCurrency } from "../utils/formatters.js";
import { useAuth } from "../context/AuthContext.jsx";

const POS = () => {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  
  // ====================================
  // STATE & REFS
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
  const [visibleProducts, setVisibleProducts] = useState(10);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [autoSend, setAutoSend] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: "", price: "" });

  // Secondary Window Ref
  const customerWindowRef = useRef(null);

  const isPro = business?.subscription?.status === "active";
  const canOverride = user?.role === "owner" || user?.role === "super_admin" || user?.permissions?.canOverridePrice;

  // ====================================
  // CUSTOMER DISPLAY LOGIC
  // ====================================
  const openCustomerDisplay = () => {
    if (customerWindowRef.current && !customerWindowRef.current.closed) {
      customerWindowRef.current.focus();
      return;
    }

    // Opens a small window intended for the second monitor
    customerWindowRef.current = window.open(
      "",
      "CustomerDisplay",
      "width=800,height=600"
    );

    updateCustomerDisplay();
  };

  const updateCustomerDisplay = (isCompleted = false, saleData = null) => {
    if (!customerWindowRef.current || customerWindowRef.current.closed) return;

    const doc = customerWindowRef.current.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Customer Display - ${business?.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: sans-serif; background: #f9fafb; display: flex; flex-direction: column; height: 100vh; margin: 0; }
            .header { background: #000; color: #fff; padding: 2rem; text-align: center; }
            .content { flex: 1; padding: 2rem; overflow-y: auto; }
            .footer { background: #fff; border-top: 2px solid #eee; padding: 2rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="text-3xl font-bold">${business?.name}</h1>
            <p class="text-gray-400">Customer Checkout View</p>
          </div>
          <div class="content">
            ${isCompleted ? `
              <div class="text-center mt-10">
                <h2 class="text-5xl font-bold text-green-600 mb-4">Sale Completed!</h2>
                <p class="text-2xl text-gray-600">Thank you for your patronage, ${customerName || "valued customer"}.</p>
                <div class="mt-8 text-4xl font-mono">${formatCurrency(saleData?.totalAmount || 0)}</div>
              </div>
            ` : `
              <table class="w-full text-left text-2xl">
                <thead>
                  <tr class="border-b-2">
                    <th class="py-4">Item</th>
                    <th class="py-4">Qty</th>
                    <th class="py-4 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${cart.map(item => `
                    <tr class="border-b">
                      <td class="py-4 font-medium">${item.name}</td>
                      <td class="py-4">x${item.quantity}</td>
                      <td class="py-4 text-right">${formatCurrency(item.quantity * item.sellingPrice)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
          <div class="footer flex justify-between items-center">
            <span class="text-3xl font-bold">Total Payable</span>
            <span class="text-5xl font-black text-blue-600">${formatCurrency(cart.reduce((sum, i) => sum + (i.quantity * i.sellingPrice), 0))}</span>
          </div>
        </body>
      </html>
    `);
    doc.close();
  };

  // Sync cart changes to customer display
  useEffect(() => {
    updateCustomerDisplay();
  }, [cart]);

  // ====================================
  // DATA LOADING
  // ====================================
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [productData, serviceData] = await Promise.all([
          request("/products?page=1&limit=100"),
          getServices({ activeOnly: true })
        ]);

        setProducts(Array.isArray(productData) ? productData : productData.products || []);
        setServices((Array.isArray(serviceData) ? serviceData : serviceData.services || []).filter(s => s.isActive !== false));
      } catch (err) {
        setError(err.message || "Failed to load POS");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ====================================
  // CART ACTIONS
  // ====================================
  const addProduct = (p) => {
    setCart(curr => {
      const exists = curr.find(i => i._id === p._id && i.itemType === "product");
      if (exists) return curr.map(i => i._id === p._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...curr, { ...p, itemType: "product", quantity: 1, sellingPrice: Number(p.sellingPrice || p.price || 0) }];
    });
  };

  const addSavedService = (s) => {
    setCart(curr => {
      const exists = curr.find(i => i.serviceId === s._id && i.itemType === "service");
      if (exists) return curr.map(i => i.serviceId === s._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...curr, { _id: "service-" + s._id, itemType: "service", serviceId: s._id, name: s.name, quantity: 1, sellingPrice: Number(s.price || 0) }];
    });
  };

  const addManualService = () => {
    if (!serviceForm.name || !serviceForm.price) return;
    setCart(prev => [...prev, { _id: "manual-" + Date.now(), itemType: "service", name: serviceForm.name, quantity: 1, sellingPrice: Number(serviceForm.price) }]);
    setServiceForm({ name: "", price: "" });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) return setCart(c => c.filter(i => i._id !== id));
    setCart(c => c.map(i => i._id === id ? { ...i, quantity: qty } : i));
  };

  const updatePrice = (id, price) => {
    setCart(c => c.map(i => i._id === id ? { ...i, sellingPrice: Number(price) || 0 } : i));
  };

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0), [cart]);

  // ====================================
  // PRINT RECEIPT UTILITY
  // ====================================
  const openPrintWindow = (sale) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    printWindow.document.write(`
      <html>
        <head><title>Print Receipt</title></head>
        <body style="font-family: monospace; padding: 20px;" onload="window.print(); window.close();">
          <center>
            <h2>${business?.name}</h2>
            <p>Receipt ID: ${sale.receiptId}</p>
          </center>
          <hr/>
          <table width="100%">
            ${cart.map(i => `
              <tr>
                <td>${i.name} x${i.quantity}</td>
                <td align="right">${formatCurrency(i.quantity * i.sellingPrice)}</td>
              </tr>
            `).join('')}
          </table>
          <hr/>
          <h3 style="display:flex; justify-content:space-between">
            <span>TOTAL:</span> <span>${formatCurrency(total)}</span>
          </h3>
          <p>Customer: ${customerName || 'N/A'}</p>
          <center><p>Thank you for your business!</p></center>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ====================================
  // CHECKOUT
  // ====================================
  const checkout = async () => {
    if (!cart.length || processing) return;

    try {
      setProcessing(true);
      setUpgradeMsg("");

      const payload = {
        customerName, customerPhone, notes, autoSend,
        items: cart.map(i => i.itemType === "product" 
          ? { itemType: "product", product: i._id, quantity: i.quantity, sellingPrice: i.sellingPrice }
          : { itemType: "service", name: i.name, quantity: i.quantity, sellingPrice: i.sellingPrice })
      };

      const res = await request("/sales", { method: "POST", body: JSON.stringify(payload) });
      const sale = res?.sale;

      // Update Secondary Screen with Completion Message
      updateCustomerDisplay(true, sale);

      // Open Print Window for Staff
      openPrintWindow(sale);

      // Reset Local State
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");

      // WhatsApp logic (omitted for brevity, keep your existing logic)
      navigate(`/app/sales/${sale._id}`);
    } catch (err) {
      setUpgradeMsg(err.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  // Memoized lists
  const filteredProducts = useMemo(() => products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase())).slice(0, visibleProducts), [products, search, visibleProducts]);
  const filteredServices = useMemo(() => services.filter(s => s.name?.toLowerCase().includes(search.toLowerCase())), [services, search]);

  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4">
      <div className="space-y-5">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Search products/services..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="flex-1 border rounded-xl p-3" 
          />
          <button 
            onClick={openCustomerDisplay}
            className="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs"
          >
            Launch Customer Screen
          </button>
        </div>

        <div className="flex gap-3">
          {["products", "services"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl capitalize ${activeTab === tab ? "bg-black text-white" : "border"}`}>{tab}</button>
          ))}
        </div>

        {activeTab === "products" && (
          <div className="bg-white border rounded-2xl p-4">
            <div className="space-y-2">
              {loading && <div>Loading...</div>}
              {filteredProducts.map(p => (
                <div key={p._id} onClick={() => addProduct(p)} className="flex justify-between p-3 border-b cursor-pointer hover:bg-gray-50">
                  <div><strong>{p.name}</strong><div className="text-xs text-gray-500">{p.category || "General"}</div></div>
                  <div className="text-right">{formatCurrency(p.sellingPrice || p.price)}<div className="text-xs text-gray-500">Stock: {p.stock}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "services" && (
           <div className="space-y-4">
             <div className="bg-white border rounded-2xl p-4">
                <h3 className="font-bold mb-3">Saved Services</h3>
                {filteredServices.map(s => (
                   <div key={s._id} onClick={() => addSavedService(s)} className="flex justify-between p-3 border-b cursor-pointer hover:bg-gray-50">
                      <span>{s.name}</span>
                      <strong>{formatCurrency(s.price)}</strong>
                   </div>
                ))}
             </div>
             <div className="bg-white border rounded-2xl p-4">
                <h3 className="font-bold mb-3">Quick Service</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder="Service" value={serviceForm.name} onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})} className="border p-2 rounded flex-1"/>
                  <input type="number" placeholder="Price" value={serviceForm.price} onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})} className="border p-2 rounded w-24"/>
                  <button onClick={addManualService} className="bg-black text-white px-4 rounded">Add</button>
                </div>
             </div>
           </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Cart</h2>
        <div className="max-h-[400px] overflow-y-auto mb-6">
          {cart.map(item => (
            <div key={item._id} className="border rounded-xl p-3 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold">{item.name}</span>
                  <div className="flex gap-2 mt-2 items-center">
                    <button onClick={() => updateQty(item._id, item.quantity - 1)} className="w-6 h-6 border rounded">-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item._id, item.quantity + 1)} className="w-6 h-6 border rounded">+</button>
                  </div>
                </div>
                <div className="text-right">
                  {canOverride ? (
                    <input 
                      type="number" 
                      value={item.sellingPrice} 
                      onChange={(e) => updatePrice(item._id, e.target.value)}
                      className="w-20 border text-right p-1 rounded"
                    />
                  ) : <span>{formatCurrency(item.sellingPrice)}</span>}
                  <div className="font-bold mt-1">{formatCurrency(item.quantity * item.sellingPrice)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border p-3 rounded-xl"/>
          <input type="text" placeholder="Phone Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full border p-3 rounded-xl"/>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between text-2xl font-black">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button 
            disabled={!cart.length || processing} 
            onClick={checkout}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl mt-4 font-bold disabled:bg-gray-300"
          >
            {processing ? "Processing Sale..." : "Complete Sale & Print"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default POS;