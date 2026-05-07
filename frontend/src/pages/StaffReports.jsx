import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import request from "../api/client.js";

import { formatCurrency } from "../utils/formatters.js";

const StaffReports = () => {

  const navigate = useNavigate();

  const [reports, setReports] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // =====================================
  // LOAD REPORTS
  // =====================================

  useEffect(() => {

    const load = async () => {

      try {

        const data =
          await request("/reports");

        setReports(data);

      } catch (err) {

        setError(
          err.message ||
          "Failed to load staff reports"
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  // =====================================
  // FILTER STAFF
  // =====================================

  const filteredStaff = useMemo(() => {

    return (
      reports?.staffPerformance?.filter((staff) =>
        staff.name
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )
      ) || []
    );

  }, [reports, search]);

  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (
      <div className="p-6">
        Loading staff analytics...
      </div>
    );
  }

  return (

    <section className="page-stack">

      {/* HEADER */}

      <div className="page-heading">

        <div>

          <span>
            Staff Analytics
          </span>

          <h1>
            Staff Performance
          </h1>

        </div>

        <button
          onClick={() =>
            navigate("/app/reports")
          }
          className="border border-gray-300 px-4 py-2 rounded-xl"
        >
          Back to Reports
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {/* SEARCH */}

      <div className="tool-panel">

        <div className="panel-heading">

          <div>

            <h2>
              Team Performance
            </h2>

            <p>
              Click a staff to view
              transaction history.
            </p>

          </div>

          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="border rounded-xl px-4 py-2"
          />

        </div>

        {/* TABLE */}

        <div className="product-table">

          <div className="product-row product-row-head">

            <span>
              Staff
            </span>

            <span>
              Total Sales
            </span>

            <span>
              Revenue
            </span>

            <span>
              Action
            </span>

          </div>

          {!filteredStaff.length && (

            <div className="empty-state">
              No staff found
            </div>

          )}

          {filteredStaff.map((staff, index) => (

            <div
              key={index}
              className="product-row"
            >

              <span className="font-semibold">
                {staff.name}
              </span>

              <span>
                {staff.sales}
              </span>

              <span>

                {formatCurrency(
                  staff.revenue
                )}

              </span>

              <button
                onClick={() =>
                  navigate(
                    `/app/sales?staff=${staff.name}`
                  )
                }
                className="text-blue-600 font-medium"
              >
                View Sales
              </button>

            </div>

          ))}

        </div>

      </div>

      {/* SUMMARY */}

      <div className="grid lg:grid-cols-3 gap-6">

        <div className="tool-panel">

          <strong>
            Total Staff
          </strong>

          <h2 className="mt-3">

            {
              filteredStaff.length
            }

          </h2>

        </div>

        <div className="tool-panel">

          <strong>
            Combined Revenue
          </strong>

          <h2 className="mt-3">

            {formatCurrency(

              filteredStaff.reduce(
                (sum, staff) =>
                  sum + staff.revenue,
                0
              )

            )}

          </h2>

        </div>

        <div className="tool-panel">

          <strong>
            Combined Sales
          </strong>

          <h2 className="mt-3">

            {

              filteredStaff.reduce(
                (sum, staff) =>
                  sum + staff.sales,
                0
              )

            }

          </h2>

        </div>

      </div>

    </section>
  );
};

export default StaffReports;