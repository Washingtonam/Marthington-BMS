import {
  useEffect,
  useState
} from "react";

import {
  getCustomers
} from "../api/customers.js";

import {
  formatCurrency
} from "../utils/formatters.js";

const Customers = () => {

  const [customers, setCustomers] =
    useState([]);

  useEffect(() => {

    const load = async () => {

      const data =
        await getCustomers();

      setCustomers(data);
    };

    load();

  }, []);

  return (

    <section className="page-stack">

      <div className="page-heading">

        <div>

          <span>
            CRM
          </span>

          <h1>
            Customers
          </h1>

        </div>

      </div>

      <div className="tool-panel">

        <div className="product-table">

          <div className="product-row product-row-head">

            <span>Name</span>

            <span>Phone</span>

            <span>Orders</span>

            <span>Spent</span>

          </div>

          {customers.map((customer) => (

            <div
              key={customer._id}
              className="product-row"
            >

              <span>
                {customer.name}
              </span>

              <span>
                {customer.phone}
              </span>

              <span>
                {customer.totalOrders}
              </span>

              <span>

                {
                  formatCurrency(
                    customer.totalSpent
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

export default Customers;