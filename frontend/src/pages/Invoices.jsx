import {
  useEffect,
  useState
} from "react";

import {
  getInvoices
} from "../api/invoices.js";

import {
  formatCurrency
} from "../utils/formatters.js";

const Invoices = () => {

  const [invoices, setInvoices] =
    useState([]);

  useEffect(() => {

    const load = async () => {

      const data =
        await getInvoices();

      setInvoices(data);
    };

    load();

  }, []);

  return (

    <section className="page-stack">

      <div className="page-heading">

        <div>

          <span>
            Billing
          </span>

          <h1>
            Invoices
          </h1>

        </div>

      </div>

      <div className="tool-panel">

        <div className="product-table">

          <div className="product-row product-row-head">

            <span>
              Invoice
            </span>

            <span>
              Customer
            </span>

            <span>
              Status
            </span>

            <span>
              Amount
            </span>

          </div>

          {invoices.map((invoice) => (

            <div
              key={invoice._id}
              className="product-row"
            >

              <span>
                {invoice.invoiceNumber}
              </span>

              <span>
                {invoice.customerName}
              </span>

              <span>
                {invoice.status}
              </span>

              <span>

                {
                  formatCurrency(
                    invoice.totalAmount
                  )
                }

              </span>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
};

export default Invoices;