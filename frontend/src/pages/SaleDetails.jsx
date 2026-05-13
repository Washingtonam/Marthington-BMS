import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";
import "../styles/receipt.css";

const Divider = () => <div className="receipt-divider" />;

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const receiptRef = useRef();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [isGenerating, setIsGenerating] = useState(false);

  // =====================================
  // DATA FETCHING
  // =====================================
  useEffect(() => {
    const fetchSaleData = async () => {
      try {
        setLoading(true);
        const data = await request(`/sales/${id}`);
        setSale(data);

        // Auto-trigger WhatsApp if coming from a fresh sale
        if (location.state?.autoSend && location.state?.phone) {
          setTimeout(() => {
            sendWhatsApp(data, location.state.phone);
          }, 1000);
        }
      } catch (err) {
        setStatusMsg({ 
          type: "error", 
          text: err.message || "Could not retrieve receipt data." 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSaleData();
  }, [id, location.state]);

  // =====================================
  // ACTIONS
  // =====================================

  const getReceiptLink = (receiptId) => `${window.location.origin}/r/${receiptId}`;

  const sendWhatsApp = (saleData, phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "").replace(/^0/, "234");
    const link = getReceiptLink(saleData.receiptId);

    const message = `🧾 *${saleData.business?.name || "Receipt"}*\n\nHello ${saleData.customerName || "Customer"},\n\nYour receipt is ready.\n\n💰 *Total: ${formatCurrency(saleData.totalAmount)}*\n\n🔗 *View online:*\n${link}\n\nThank you for your patronage!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyLink = () => {
    const link = getReceiptLink(sale.receiptId);
    navigator.clipboard.writeText(link);
    setStatusMsg({ type: "success", text: "Link copied to clipboard!" });
    setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
  };

  const handleDownloadImage = async () => {
    try {
      setIsGenerating(true);
      const element = receiptRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3, // High quality but balanced file size
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.href = image;
      link.download = `Receipt-${sale.receiptId}.jpg`;
      link.click();
    } catch (err) {
      setStatusMsg({ type: "error", text: "Image generation failed." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    
    // Collect all active styles
    let styles = "";
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) styles += rule.cssText;
      } catch (e) { /* Cross-origin styles skip */ }
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Receipt - ${sale.receiptId}</title>
          <style>
            ${styles}
            body { background: #f3f4f6; padding: 20px; font-family: system-ui, sans-serif; }
            .print-wrap { display: flex; flex-direction: column; align-items: center; }
            .receipt { background: white; width: 100%; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            @media print {
              body { background: white; padding: 0; }
              .receipt { width: 80mm; max-width: 80mm; box-shadow: none; border: none; }
              @page { size: 80mm auto; margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-wrap">
            <div class="receipt">${content}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // =====================================
  // RENDER HELPERS
  // =====================================

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Fetching receipt...</p>
    </div>
  );

  if (!sale) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-3xl shadow-sm">
        <p className="text-red-500 font-bold text-xl">Receipt not found</p>
        <button onClick={() => navigate("/app/sales")} className="mt-4 text-blue-600 underline">Return to Sales</button>
      </div>
    </div>
  );

  const business = sale.business || {};
  const theme = business.receiptTheme || "modern";

  return (
    <section className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8">
        
        {/* LEFT: RECEIPT PREVIEW */}
        <div className="flex flex-col items-center">
          <div 
            ref={receiptRef} 
            className={`receipt receipt-${theme} shadow-2xl rounded-xl overflow-hidden`}
          >
            {/* LOGO & WATERMARK */}
            {business.logo && (
              <>
                <div className="receipt-watermark">
                  <img src={business.logo} alt="" crossOrigin="anonymous" />
                </div>
                <div className="receipt-logo">
                  <img src={business.logo} alt="Business Logo" crossOrigin="anonymous" />
                </div>
              </>
            )}

            <div className="receipt-business text-center">
              <h1 className="text-2xl font-bold">{business.name}</h1>
              {business.address && <p className="text-sm opacity-80">{business.address}</p>}
              {business.phone && <p className="text-sm opacity-80">{business.phone}</p>}
            </div>

            <Divider />

            <div className="receipt-meta space-y-1">
              <div className="receipt-row"><span>Receipt ID</span><strong>#{sale.receiptId}</strong></div>
              <div className="receipt-row"><span>Date</span><strong>{new Date(sale.createdAt).toLocaleString()}</strong></div>
              <div className="receipt-row"><span>Cashier</span><strong>{sale.createdBy?.name || "Staff"}</strong></div>
              {sale.customerName && <div className="receipt-row"><span>Customer</span><strong>{sale.customerName}</strong></div>}
            </div>

            <Divider />

            <div className="receipt-items py-2">
              {sale.items?.map((item, idx) => (
                <div key={idx} className="receipt-item flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.quantity} × {formatCurrency(item.sellingPrice)}</p>
                  </div>
                  <strong className="text-gray-900">{formatCurrency(item.quantity * item.sellingPrice)}</strong>
                </div>
              ))}
            </div>

            <Divider />

            <div className="receipt-total flex justify-between items-center py-2">
              <span className="text-lg font-bold">TOTAL</span>
              <strong className="text-2xl font-black text-blue-700">{formatCurrency(sale.totalAmount)}</strong>
            </div>

            {sale.notes && (
              <>
                <Divider />
                <div className="receipt-notes italic text-sm text-gray-600">
                  <h4 className="not-italic font-bold text-gray-800">Notes:</h4>
                  <p>{sale.notes}</p>
                </div>
              </>
            )}

            <Divider />

            <div className="receipt-footer text-center space-y-1 text-xs text-gray-500">
              <p className="font-bold text-gray-700">Thank you for your patronage!</p>
              {business.receiptFooter && <p>{business.receiptFooter}</p>}
              <p className="pt-2 opacity-50 uppercase tracking-widest">Powered by Marthington</p>
            </div>
          </div>
        </div>

        {/* RIGHT: ACTION PANEL */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-xl p-6 sticky top-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Receipt Actions</h2>
            <p className="text-sm text-gray-500 mb-6">Manage sharing and printing for this transaction.</p>

            {statusMsg.text && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
                statusMsg.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              }`}>
                {statusMsg.text}
              </div>
            )}

            <div className="grid gap-3">
              <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3.5 rounded-2xl font-semibold hover:bg-black transition-all"
              >
                🖨️ Print / Save PDF
              </button>

              <button 
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3.5 rounded-2xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "🖼️ Download Image (JPG)"}
              </button>

              <button 
                onClick={() => {
                  const phone = prompt("Enter customer WhatsApp number (e.g. 080123...)");
                  if (phone) sendWhatsApp(sale, phone);
                }}
                className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3.5 rounded-2xl font-semibold hover:bg-green-700 transition-all"
              >
                💬 Share via WhatsApp
              </button>

              <button 
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
              >
                🔗 Copy Receipt Link
              </button>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <button 
                  onClick={() => navigate("/app/sales")}
                  className="w-full text-gray-500 font-medium py-2 hover:text-gray-800 transition-colors"
                >
                  ← Back to Sales History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SaleDetails;