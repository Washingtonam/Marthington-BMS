import {
  useEffect,
  useState
} from "react";

import request from "../api/client.js";

import {
  formatCurrency
} from "../utils/formatters.js";

import {
  CSVLink
} from "react-csv";

const Reports = () => {

  const [reports, setReports] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {

    const load = async () => {

      try {

        const data =
          await request(
            "/reports"
          );

        setReports(data);

      } catch (err) {

        setError(
          err.message ||
          "Failed to load reports"
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  if (loading) {

    return (
      <div className="p-6">
        Loading reports...
      </div>
    );
  }

  const overview =
    reports?.overview || {};

  const csvData =
    reports?.recentSales?.map(
      (sale) => ({
        Receipt:
          sale.receiptId,

        Amount:
          sale.totalAmount,

        Staff:
          sale.createdBy?.name,

        Date:
          new Date(
            sale.createdAt
          ).toLocaleString()
      })
    ) || [];

  return (

    <section className="page-stack">

      {/* HEADER */}

      <div className="page-heading">

        <div>

          <span>
            Reporting Center
          </span>

          <h1>
            Reports
          </h1>

        </div>

        <CSVLink
          data={csvData}

          filename="sales-report.csv"

          className="bg-black text-white px-4 py-2 rounded-md text-sm"
        >

          Export CSV

        </CSVLink>

      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {/* OVERVIEW */}

      <div className="metrics-grid">

        <div className="tool-panel">
          <strong>
            Today's Revenue
          </strong>

          <h2>
            {
              formatCurrency(
                overview.todayRevenue
              )
            }
          </h2>
        </div>

        <div className="tool-panel">
          <strong>
            Monthly Revenue
          </strong>

          <h2>
            {
              formatCurrency(
                overview.monthlyRevenue
              )
            }
          </h2>
        </div>

        <div className="tool-panel">
          <strong>
            Monthly Profit
          </strong>

          <h2>
            {
              formatCurrency(
                overview.monthlyProfit
              )
            }
          </h2>
        </div>

        <div className="tool-panel">
          <strong>
            Inventory Value
          </strong>

          <h2>
            {
              formatCurrency(
                overview.inventoryValue
              )
            }
          </h2>
        </div>

      </div>

      {/* STAFF PERFORMANCE */}

      <div className="tool-panel">

        <div className="panel-heading">
          <h2>
            Staff Performance
          </h2>
        </div>

        <div className="product-table">

          <div className="product-row product-row-head">

            <span>Staff</span>

            <span>Sales</span>

            <span>Revenue</span>

          </div>

          {!reports
            ?.staffPerformance
            ?.length && (
            <div className="empty-state">
              No staff data
            </div>
          )}

          {reports
            ?.staffPerformance
            ?.map((staff, index) => (

              <div
                key={index}
                className="product-row"
              >

                <span>
                  {staff.name}
                </span>

                <span>
                  {staff.sales}
                </span>

                <span>

                  {
                    formatCurrency(
                      staff.revenue
                    )
                  }

                </span>

              </div>
            ))}

        </div>

      </div>

      {/* LOW STOCK */}

      <div className="tool-panel">

        <div className="panel-heading">
          <h2>
            Low Stock Alerts
          </h2>
        </div>

        <div className="compact-list">

          {!reports
            ?.lowStockProducts
            ?.length && (
            <div className="empty-state">
              No low stock products
            </div>
          )}

          {reports
            ?.lowStockProducts
            ?.map((product) => (

              <div
                key={product._id}
                className="compact-row"
              >

                <div>

                  <strong>
                    {product.name}
                  </strong>

                  <span>
                    SKU:
                    {" "}
                    {product.sku || "N/A"}
                  </span>

                </div>

                <span className="text-red-500 font-semibold">

                  {product.stock}

                </span>

              </div>
            ))}

        </div>

      </div>

      {/* RECENT SALES */}

      <div className="tool-panel">

        <div className="panel-heading">
          <h2>
            Recent Sales
          </h2>
        </div>

        <div className="product-table">

          <div className="product-row product-row-head">

            <span>
              Receipt
            </span>

            <span>
              Amount
            </span>

            <span>
              Staff
            </span>

            <span>
              Date
            </span>

          </div>

          {!reports
            ?.recentSales
            ?.length && (
            <div className="empty-state">
              No sales yet
            </div>
          )}

          {reports
            ?.recentSales
            ?.map((sale) => (

              <div
                key={sale._id}
                className="product-row"
              >

                <span>
                  {sale.receiptId}
                </span>

                <span>

                  {
                    formatCurrency(
                      sale.totalAmount
                    )
                  }

                </span>

                <span>
                  {
                    sale.createdBy?.name ||
                    "Unknown"
                  }
                </span>

                <span>

                  {
                    new Date(
                      sale.createdAt
                    ).toLocaleString()
                  }

                </span>

              </div>
            ))}

        </div>

      </div>

    </section>
  );
};

export default Reports;