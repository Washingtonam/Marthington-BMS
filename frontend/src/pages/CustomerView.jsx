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
    // Listen for messages from POS.jsx
    const bc = new BroadcastChannel('marthington_customer_display');

    bc.onmessage = (event) => {
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

    return () => bc.close();
  }, []);

  if (data.status === "complete") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-blue-600 text-white p-10 text-center">
        <div className="mb-6 text-8xl">✅</div>
        <h1 className="text-6xl font-black mb-4">Transaction Successful</h1>
        <p className="text-2xl opacity-90">Thank you for your patronage, {data.customerName || "Customer"}!</p>
        <p className="mt-8 text-lg font-medium bg-white/20 px-6 py-2 rounded-full">
          Please collect your receipt from the attendant.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col p-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-6 mb-6">
        <div>
          <h1 className="text-4xl font-black text-blue-600 uppercase tracking-tight">
            {data.businessName || "Checkout"}
          </h1>
          {data.customerName && (
            <p className="text-gray-500 text-xl mt-1">Customer: <span className="font-bold text-gray-800">{data.customerName}</span></p>
          )}
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm uppercase font-bold tracking-widest">Grand Total</p>
          <p className="text-6xl font-black text-gray-900">{formatCurrency(data.total)}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Item List */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto p-6">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 uppercase text-sm border-b">
                <th className="pb-4 font-bold">Item Description</th>
                <th className="pb-4 font-bold text-center">Qty</th>
                <th className="pb-4 font-bold text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-20 text-center text-gray-300 text-2xl font-medium">
                    Waiting for items...
                  </td>
                </tr>
              ) : (
                data.items.map((item, idx) => (
                  <tr key={idx} className="animate-in fade-in slide-in-from-bottom-2">
                    <td className="py-5 font-bold text-2xl text-gray-800">{item.name}</td>
                    <td className="py-5 text-center text-2xl text-gray-600">×{item.quantity}</td>
                    <td className="py-5 text-right font-black text-2xl text-gray-900">{formatCurrency(item.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sidebar Info */}
        {(data.notes) && (
          <div className="w-1/3 space-y-6">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <h3 className="text-blue-600 font-bold uppercase text-xs mb-3">Customer Notes</h3>
              <p className="text-blue-900 text-lg leading-relaxed font-medium italic">
                "{data.notes}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-6 flex justify-between items-center text-gray-400">
        <p className="font-medium italic">Powered by Marthington POS</p>
        <p className="font-bold tracking-tighter text-gray-300">v2.0.1</p>
      </div>
    </div>
  );
};

export default CustomerView;