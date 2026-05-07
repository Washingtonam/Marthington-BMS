import { useEffect, useMemo, useState } from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import request from "../api/client.js";

import { formatCurrency } from "../utils/formatters.js";

const Sales = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const params = new URLSearchParams(
    location.search
  );

  const staffFilter =
    params.get("staff") || "";

  const [sales, setSales] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState(staffFilter);

  // =====================================
  // LOAD SALES
  // =====================================

  useEffect(() => {

    const load = async () => {

      try {

        const data =
          await request("/sales");

        setSales(data);

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  // =====================================
  // FILTERED SALES
  // =====================================

  const filteredSales = useMemo(() => {

    return sales.filter((sale) => {

      const term =
        search.toLowerCase();

      const receipt =
        sale.receiptId
          ?.toLowerCase() || "";

      const customer =
        sale.customerName
          ?.toLowerCase() || "";

      const staff =
        sale.createdBy?.name
          ?.toLowerCase() || "";

      const items =
        sale.items
          ?.map((item) =>
            item.name?.toLowerCase()
          )
          .join(" ");

      return (
        receipt.includes(term) ||
        customer.includes(term) ||
        staff.includes(term) ||
        items.includes(term)
      );
    });

  }, [sales, search]);

  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (
      <div className="p-6">
        Loading sales...
      </div>
    );
  }

  return (

    <section className="page-stack">

      {/* HEADER */}

      <div className="page-heading">

        <div>

          <span>
            Sales Center
          </span>

          <h1>
            Sales History
          </h1>

        </div>

        <p>
          Track receipts, staff activity and completed transactions.
        </p>

      </div>

      {/* SEARCH */}

      <div className="tool-panel">

        <div className="panel-heading">

          <div>

            <h2>
              Search Transactions
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Search by receipt, staff, customer or product
            </p>

          </div>

        </div>

        <div className="table-search">

          <input
            placeholder="Search receipt, staff, customer or item..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

      </div>

      {/* SALES TABLE */}

      <div className="tool-panel">

        <div className="panel-heading">

          <div>

            <h2>
              All Transactions
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Click any transaction to view full receipt
            </p>

          </div>

          <div className="text-sm text-gray-500">
            {filteredSales.length} Transactions
          </div>

        </div>

        <div className="product-table">

          {/* HEADER */}

          <div className="product-row product-row-head">

            <span>
              Receipt
            </span>

            <span>
              Items Sold
            </span>

            <span>
              Total
            </span>

            <span>
              Staff
            </span>

            <span>
              Action
            </span>

          </div>

          {/* EMPTY */}

          {!filteredSales.length && (

            <div className="empty-state">
              No transactions found
            </div>

          )}

          {/* ROWS */}

          {filteredSales.map((sale) => (

            <button
              key={sale._id}
              type="button"
              onClick={() =>
                navigate(
                  `/app/sales/${sale._id}`
                )
              }
              className="product-row text-left hover:bg-gray-50 transition"
            >

              {/* RECEIPT */}

              <span>

                <div className="font-semibold text-blue-600">
                  #{sale.receiptId}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {new Date(
                    sale.createdAt
                  ).toLocaleString()}
                </div>

              </span>

              {/* ITEMS */}

              <span>

                <div className="font-medium">

                  {sale.items
                    ?.slice(0, 2)
                    .map((item) => item.name)
                    .join(", ")}

                  {sale.items?.length > 2 &&
                    " ..."}

                </div>

                <div className="text-xs text-gray-500 mt-1">

                  {sale.items?.length}
                  {" "}
                  item(s)

                </div>

              </span>

              {/* TOTAL */}

              <span className="font-semibold">

                {formatCurrency(
                  sale.totalAmount
                )}

              </span>

              {/* STAFF */}

              <span>

                {sale.createdBy?.name ||
                  "Unknown"}

              </span>

              {/* ACTION */}

              <span className="text-blue-600 font-medium">
                View Receipt
              </span>

            </button>

          ))}

        </div>

      </div>

    </section>
  );
};

export default Sales;