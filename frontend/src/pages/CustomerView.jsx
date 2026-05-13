import { useEffect, useState } from "react";
import { formatCurrency } from "../utils/formatters.js";

const CustomerView = () => {
  const [data, setData] = useState({
    items: [],
    total: 0,
    businessName: "Welcome",
    customerName: "",
    notes: "",
    status: "pending"
  });

  useEffect(() => {
    // We initialize the channel inside useEffect to prevent SSR/Initialization errors
    const bc = new BroadcastChannel('marthington_customer_display');

    const handleMessage = (event) => {
      if (event.data.type === "UPDATE_CART") {
        setData((prev) => ({
          ...prev,
          ...event.data,
          status: "pending"
        }));
      }

      if (event.data.type === "SALE_COMPLETE") {
        setData((prev) => ({ ...prev, status: "complete" }));
      }
    };

    bc.addEventListener("message", handleMessage);

    // Clean up to prevent memory leaks and initialization errors on hot-reload
    return () => {
      bc.removeEventListener("message", handleMessage);
      bc.close();
    };
  }, []);

  if (data.status === "complete") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-blue-600 text-white p-10 text-center animate-in fade-in duration-500">
        <div className="mb-6 text-8xl">✅</div>
        <h1 className="text-6xl font-black mb-4 uppercase">Success</h1>
        <p className="text-2xl opacity-90">Thank you for your patronage, {data.customerName || "Customer"}!</p>
        <div className="mt-10 p-6 bg-white/10 rounded-3xl border border-white/20">
            <p className="text-xl font-bold">Total Paid: {formatCurrency(data.total)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col p-8 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-end border-b-4 border-blue-600 pb-6 mb-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">
            {data.businessName || "Steve Computer Warehouse"}
          </h1>
          {data.customerName && (
            <p className="text-blue-600 text-2xl font-bold mt-2">
              Billed To: <span className="text-gray-700">{data.customerName}</span>
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm uppercase font-black tracking-widest">Amount Due</p>
          <p className="text-7xl font-black text-blue-600 leading-none">{formatCurrency(data.total)}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Item List */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-200 overflow-y-auto p-8">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 uppercase text-xs font-black border-b-2">
                <th className="pb-4">Description</th>
                <th className="pb-4 text-center">Quantity</th>
                <th className="pb-4 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-32 text-center">
                    <p className="text-gray-300 text-3xl font-bold uppercase tracking-tighter">Ready for Transaction</p>
                    <p className="text-gray-400">Items added to cart will appear here</p>
                  </td>
                </tr>
              ) : (
                data.items.map((item, idx) => (
                  <tr key={idx} className="animate-in slide-in-from-right-4 duration-300">
                    <td className="py-6 font-bold text-3xl text-gray-800">{item.name}</td>
                    <td className="py-6 text-center text-3xl text-gray-500 font-medium">× {item.quantity}</td>
                    <td className="py-6 text-right font-black text-3xl text-gray-900">{formatCurrency(item.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Notes Sidebar - High Visibility for Warranty/Specs */}
        {data.notes && (
          <div className="w-1/3 animate-in slide-in-from-bottom-8">
            <div className="bg-yellow-50 p-8 rounded-3xl border-2 border-yellow-200 h-full">
              <h3 className="text-yellow-700 font-black uppercase text-sm mb-4 tracking-widest">Important Notes</h3>
              <p className="text-yellow-900 text-2xl leading-snug font-bold italic">
                "{data.notes}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-8 flex justify-between items-center text-gray-400 border-t pt-4">
        <p className="font-bold text-sm tracking-widest uppercase">System: Marthington POS v2.0</p>
        <p className="text-xs">Benin City, Nigeria</p>
      </div>
    </div>
  );
};

export default CustomerView;