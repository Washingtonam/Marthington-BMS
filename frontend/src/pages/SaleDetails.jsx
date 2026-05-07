import { useEffect, useState, useRef } from "react";
import {
  useParams,
  useNavigate,
  useLocation
} from "react-router-dom";

import request from "../api/client.js";

import {
  formatCurrency
} from "../utils/formatters.js";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const Divider = () => (
  <div className="border-t border-dashed border-gray-300 my-4" />
);

const SaleDetails = () => {

  const { id } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  const [sale, setSale] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [upgradeMsg, setUpgradeMsg] =
    useState("");

  const receiptRef = useRef();

  // ====================================
  // LOAD SALE
  // ====================================

  useEffect(() => {

    const load = async () => {

      try {

        setLoading(true);

        const data =
          await request(`/sales/${id}`);

        setSale(data);

        // AUTO WHATSAPP
        if (
          location.state?.autoSend &&
          location.state?.phone &&
          data.business?.subscription?.status ===
            "active"
        ) {

          sendWhatsApp(
            data,
            location.state.phone
          );
        }

      } catch (err) {

        setUpgradeMsg(
          err.message ||
          "Failed to load receipt"
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, [id]);

  // ====================================
  // LOADING
  // ====================================

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading receipt...
      </div>
    );
  }

  if (!sale) {

    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Receipt not found
      </div>
    );
  }

  const business =
    sale.business || {};

  const theme =
    business.receiptTheme ||
    "modern";

  const isPro =
    business.subscription?.plan ===
    "pro";

  // ====================================
  // WHATSAPP
  // ====================================

  const sendWhatsApp = (
    saleData,
    phone
  ) => {

    if (!isPro) {

      setUpgradeMsg(
        "WhatsApp sharing is a Pro feature."
      );

      return;
    }

    const cleanPhone =
      phone.replace(/\D/g, "")
        .replace(/^0/, "234");

    const receiptLink =
      `${window.location.origin}/r/${saleData.receiptId}`;

    const message = `
🧾 ${saleData.business?.name}

Hello ${saleData.customerName || "Customer"},

Your receipt is ready.

💰 Amount:
${formatCurrency(saleData.totalAmount)}

🔗 View Receipt:
${receiptLink}

Thank you for your patronage.
`;

    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  // ====================================
  // PDF
  // ====================================

  const handleDownloadPDF = async () => {

    if (!isPro) {
      setUpgradeMsg(
        "PDF download is a Pro feature."
      );
      return;
    }

    try {

      const element = receiptRef.current;

      const canvas = await html2canvas(
        element,
        {
          scale: 4,
          useCORS: true,
          backgroundColor: "#ffffff"
        }
      );

      const imgData =
        canvas.toDataURL("image/jpeg", 1.0);

      // 🔥 THERMAL WIDTH
      const pdfWidth = 80;

      // 🔥 PERFECT HEIGHT SCALE
      const pdfHeight =
        (canvas.height * pdfWidth) /
        canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(
        imgData,
        "JPEG",
        0,
        0,
        pdfWidth,
        pdfHeight
      );

      pdf.save(
        `Receipt-${sale.receiptId}.pdf`
      );

    } catch (err) {

      console.error(err);

      setUpgradeMsg(
        "PDF generation failed"
      );
    }
  };

  // ====================================
  // PRINT
  // ====================================

  const handlePrint = () => {

    const printContents =
      receiptRef.current.innerHTML;

    const printWindow =
      window.open(
        "",
        "",
        "width=420,height=800"
      );

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>

          <style>

            body {
              font-family: Arial, sans-serif;
              padding: 0;
              margin: 0;
              background: white;
              display: flex;
              justify-content: center;
            }

            .print-wrapper {
              width: 80mm;
              padding: 12px;
            }

            img {
              max-width: 120px;
              object-fit: contain;
            }

            .divider {
              border-top: 1px dashed #999;
              margin: 10px 0;
            }

          </style>

        </head>

        <body>

          <div class="print-wrapper">
            ${printContents}
          </div>

        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {

      printWindow.print();

      printWindow.close();

    }, 500);
  };

  return (

    <section className="min-h-screen bg-gray-100 py-8 px-4">

      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* RECEIPT AREA */}

        <div className="flex justify-center">

          <div
            ref={receiptRef}
            className={`
              bg-white
              w-full
              max-w-[380px]
              rounded-3xl
              shadow-xl
              p-6
              receipt
              ${theme}
            `}
          >

            {/* LOGO */}

            {business.logo && (

              <div className="flex justify-center mb-4">

                <img
                  src={business.logo}
                  alt="logo"
                  className="max-h-14 object-contain"
                />

              </div>

            )}

            {/* BUSINESS */}

            <div className="text-center">

              <h1 className="font-bold text-xl uppercase tracking-wide">

                {business.name}

              </h1>

              {business.address && (

                <p className="text-xs text-gray-500 mt-1">

                  {business.address}

                </p>

              )}

              {business.phone && (

                <p className="text-xs text-gray-500">

                  {business.phone}

                </p>

              )}

            </div>

            <Divider />

            {/* SALE INFO */}

            <div className="space-y-2 text-sm">

              <div className="flex justify-between">

                <span className="text-gray-500">
                  Receipt ID
                </span>

                <span className="font-medium">
                  {sale.receiptId}
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-gray-500">
                  Date
                </span>

                <span>

                  {new Date(
                    sale.createdAt
                  ).toLocaleString()}

                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-gray-500">
                  Cashier
                </span>

                <span>

                  {sale.createdBy?.name || "-"}

                </span>

              </div>

              {sale.customerName && (

                <div className="flex justify-between">

                  <span className="text-gray-500">
                    Customer
                  </span>

                  <span>
                    {sale.customerName}
                  </span>

                </div>

              )}

            </div>

            <Divider />

            {/* ITEMS */}

            <div className="space-y-4">

              {sale.items?.map(
                (item, index) => (

                  <div
                    key={index}
                    className="space-y-1"
                  >

                    <div className="flex justify-between gap-3">

                      <div>

                        <div className="font-semibold text-sm">

                          {item.name}

                        </div>

                        <div className="text-xs text-gray-500">

                          {item.quantity}
                          {" × "}
                          {formatCurrency(
                            item.sellingPrice
                          )}

                        </div>

                      </div>

                      <div className="font-semibold text-sm whitespace-nowrap">

                        {formatCurrency(
                          item.quantity *
                            item.sellingPrice
                        )}

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

            <Divider />

            {/* TOTAL */}

            <div className={`
                flex
                justify-between
                items-center
                mt-4
                p-3
                rounded-xl
                ${theme === "premium"
                  ? "bg-black text-white"
                  : "bg-gray-100"}
              `}>

              <span className="text-lg font-bold">
                TOTAL
              </span>

              <span className="text-2xl font-extrabold">

                {formatCurrency(
                  sale.totalAmount
                )}

              </span>

            </div>

            {/* NOTES */}

            {sale.notes && (

              <>
                <Divider />

                <div>

                  <div className="font-semibold text-sm mb-1">
                    Notes
                  </div>

                  <p className="text-xs text-gray-600">
                    {sale.notes}
                  </p>

                </div>
              </>

            )}

            <Divider />

            {/* FOOTER */}

            <div className="text-center text-xs text-gray-500 space-y-2">

              <p className="font-semibold text-gray-700">

                Thank you for your patronage

              </p>

              {business.receiptFooter && (
                <p>
                  {business.receiptFooter}
                </p>
              )}

              <p className="pt-2">
                Powered by Marthington
              </p>

            </div>

          </div>

        </div>

        {/* ACTION PANEL */}

        <div className="xl:sticky xl:top-6 h-fit">

          <div className="bg-white rounded-3xl shadow-lg p-5 space-y-4">

            <div>

              <h2 className="font-bold text-lg">
                Receipt Actions
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Print, share and export receipt
              </p>

            </div>

            {upgradeMsg && (

              <div className="bg-red-100 text-red-700 text-sm rounded-xl px-4 py-3">

                {upgradeMsg}

              </div>

            )}

            {/* PRINT */}

            <button
              onClick={handlePrint}
              className="w-full bg-black text-white py-3 rounded-2xl font-medium hover:opacity-90 transition"
            >
              Print Receipt
            </button>

            {/* PDF */}

            <button
              onClick={handleDownloadPDF}
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-medium hover:opacity-90 transition"
            >
              Download PDF
            </button>

            {/* WHATSAPP */}

            <button
              onClick={() => {

                const phone =
                  prompt(
                    "Enter customer phone number"
                  );

                if (phone) {

                  sendWhatsApp(
                    sale,
                    phone
                  );
                }

              }}
              className="w-full bg-green-600 text-white py-3 rounded-2xl font-medium hover:opacity-90 transition"
            >
              Send via WhatsApp
            </button>

            {/* BACK */}

            <button
              onClick={() =>
                navigate("/app/pos")
              }
              className="w-full border border-gray-300 py-3 rounded-2xl font-medium hover:bg-gray-50 transition"
            >
              Back to POS
            </button>

            {/* UPGRADE */}

            {!isPro && (

              <div className="pt-2 border-t">

                <button
                  onClick={() =>
                    navigate("/app/settings")
                  }
                  className="w-full bg-gradient-to-r from-black to-gray-700 text-white py-3 rounded-2xl font-semibold"
                >
                  Upgrade to Pro 🚀
                </button>

              </div>

            )}

          </div>

        </div>

      </div>

    </section>
  );
};

export default SaleDetails;