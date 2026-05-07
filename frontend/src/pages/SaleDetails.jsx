import { useEffect, useState, useRef } from "react";

import "../styles/receipt.css";

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

const Divider = () => (
  <div className="receipt-divider" />
);

const SaleDetails = () => {

  const { id } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  const receiptRef = useRef();

  const [sale, setSale] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [upgradeMsg, setUpgradeMsg] =
    useState("");

  // =====================================
  // LOAD SALE
  // =====================================

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
          location.state?.phone
        ) {

          setTimeout(() => {

            sendWhatsApp(
              data,
              location.state.phone
            );

          }, 1200);

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

  // =====================================
  // LOADING
  // =====================================

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

  // =====================================
  // WHATSAPP
  // =====================================

  const sendWhatsApp = (
    saleData,
    phone
  ) => {

    if (!phone) return;

    const cleanPhone =
      phone
        .replace(/\D/g, "")
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

  // =====================================
  // DOWNLOAD JPG
  // =====================================

  const handleDownloadImage =
    async () => {

      try {

        const element =
          receiptRef.current;

        if (!element) return;

        const canvas =
          await html2canvas(
            element,
            {
              scale: 5,
              useCORS: true,
              backgroundColor: "#ffffff",
              logging: false
            }
          );

        const image =
          canvas.toDataURL(
            "image/jpeg",
            1.0
          );

        const link =
          document.createElement("a");

        link.href = image;

        link.download =
          `Receipt-${sale.receiptId}.jpg`;

        document.body.appendChild(
          link
        );

        link.click();

        document.body.removeChild(
          link
        );

      } catch (err) {

        console.error(err);

        setUpgradeMsg(
          "Failed to download receipt image"
        );
      }
    };

  // =====================================
  // PRINT ENGINE
  // =====================================

  const handlePrint = () => {

    const receiptHTML =
      receiptRef.current?.outerHTML;

    if (!receiptHTML) return;

    let cssText = "";

    for (const sheet of document.styleSheets) {

      try {

        for (const rule of sheet.cssRules) {

          cssText += rule.cssText;

        }

      } catch (err) {

        console.warn(
          "Cannot access stylesheet",
          err
        );
      }
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=450,height=900"
      );

    if (!printWindow) {

      setUpgradeMsg(
        "Popup blocked. Please allow popups."
      );

      return;
    }

    printWindow.document.write(`
      <html>

        <head>

          <title>
            Receipt ${sale.receiptId}
          </title>

          <meta charset="UTF-8" />

          <style>

            ${cssText}

            * {
              box-sizing: border-box;
            }

            html,
            body {

              margin: 0;
              padding: 0;

              background: #f3f4f6;

              font-family:
                Inter,
                sans-serif;

            }

            body {

              display: flex;
              justify-content: center;

              padding: 24px;

            }

            .receipt {

              width: 100% !important;
              max-width: 380px !important;

            }

            img {

              max-width: 100%;
              display: block;

            }

            @media print {

              html,
              body {

                background: white !important;
                padding: 0 !important;

              }

              body {

                display: block !important;

              }

              .receipt {

                width: 80mm !important;
                max-width: 80mm !important;

                margin: 0 auto !important;

                border-radius: 0 !important;

                box-shadow: none !important;

                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;

              }

              @page {

                size: 80mm auto;
                margin: 0;

              }

            }

          </style>

        </head>

        <body>

          ${receiptHTML}

          <script>

            window.onload = () => {

              setTimeout(() => {

                window.focus();

                printWindow.print();

              }, 800);

            };

            window.onafterprint = () => {

              window.close();

            };

          </script>

        </body>

      </html>
    `);

    printWindow.document.close();
  };

  return (

    <section className="min-h-screen bg-gray-100 py-8 px-4">

      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* RECEIPT */}

        <div className="flex justify-center">

          <div
            ref={receiptRef}
            className={`receipt receipt-${theme}`}
          >

            {/* WATERMARK */}

            {business.logo && (

              <div className="receipt-watermark">

                <img
                  src={business.logo}
                  alt="watermark"
                  crossOrigin="anonymous"
                />

              </div>

            )}

            {/* LOGO */}

            {business.logo && (

              <div className="receipt-logo">

                <img
                  src={business.logo}
                  alt="logo"
                  crossOrigin="anonymous"
                />

              </div>

            )}

            {/* BUSINESS */}

            <div className="receipt-business">

              <h1>
                {business.name}
              </h1>

              {business.address && (
                <p>
                  {business.address}
                </p>
              )}

              {business.phone && (
                <p>
                  {business.phone}
                </p>
              )}

            </div>

            <Divider />

            {/* META */}

            <div className="receipt-meta">

              <div className="receipt-row">

                <span>
                  Receipt ID
                </span>

                <strong>
                  {sale.receiptId}
                </strong>

              </div>

              <div className="receipt-row">

                <span>
                  Date
                </span>

                <strong>

                  {new Date(
                    sale.createdAt
                  ).toLocaleString()}

                </strong>

              </div>

              <div className="receipt-row">

                <span>
                  Cashier
                </span>

                <strong>
                  {sale.createdBy?.name || "-"}
                </strong>

              </div>

              {sale.customerName && (

                <div className="receipt-row">

                  <span>
                    Customer
                  </span>

                  <strong>
                    {sale.customerName}
                  </strong>

                </div>

              )}

            </div>

            <Divider />

            {/* ITEMS */}

            <div className="receipt-items">

              {sale.items?.map(
                (item, index) => (

                  <div
                    key={index}
                    className="receipt-item"
                  >

                    <div>

                      <h4>
                        {item.name}
                      </h4>

                      <p>

                        {item.quantity}
                        {" × "}
                        {formatCurrency(
                          item.sellingPrice
                        )}

                      </p>

                    </div>

                    <strong>

                      {formatCurrency(
                        item.quantity *
                        item.sellingPrice
                      )}

                    </strong>

                  </div>
                )
              )}

            </div>

            <Divider />

            {/* TOTAL */}

            <div className="receipt-total">

              <span>
                TOTAL
              </span>

              <strong>

                {formatCurrency(
                  sale.totalAmount
                )}

              </strong>

            </div>

            {/* NOTES */}

            {sale.notes && (

              <>

                <Divider />

                <div className="receipt-notes">

                  <h4>
                    Notes
                  </h4>

                  <p>
                    {sale.notes}
                  </p>

                </div>

              </>

            )}

            <Divider />

            {/* FOOTER */}

            <div className="receipt-footer">

              <p className="thank-you">
                Thank you for your patronage
              </p>

              {business.receiptFooter && (
                <p>
                  {business.receiptFooter}
                </p>
              )}

              <p>
                Powered by Marthington
              </p>

            </div>

          </div>

        </div>

        {/* ACTION PANEL */}

        <div className="xl:sticky xl:top-6 h-fit no-print">

          <div className="bg-white rounded-3xl shadow-lg p-5 space-y-4">

            <div>

              <h2 className="font-bold text-lg">
                Receipt Actions
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Print, save as PDF or share receipt
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
              Print / Save PDF
            </button>

            {/* JPG */}

            <button
              onClick={handleDownloadImage}
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-medium hover:opacity-90 transition"
            >
              Download JPG
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
              Share via WhatsApp
            </button>

            {/* BACK */}

            <button
              onClick={() =>
                navigate("/app/sales")
              }
              className="w-full border border-gray-300 py-3 rounded-2xl font-medium hover:bg-gray-50 transition"
            >
              Back to Sales
            </button>

          </div>

        </div>

      </div>

    </section>
  );
};

export default SaleDetails;