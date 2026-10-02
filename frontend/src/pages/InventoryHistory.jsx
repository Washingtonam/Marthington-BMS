import {
  useEffect,
  useState
} from "react";

import request from "../api/client.js";

const InventoryHistory = () => {

  const [history, setHistory] =
    useState([]);

  useEffect(() => {

    const load = async () => {

      const data =
        await request(
          "/inventory"
        );

      setHistory(data);
    };

    load();

  }, []);

  return (

    <section className="page-stack">

      <div className="page-heading">

        <div>

          <span>
            Inventory
          </span>

          <h1>
            Stock Movements
          </h1>

        </div>

      </div>

      <div className="tool-panel">

        <div className="product-table">

          <div className="product-row product-row-head">

            <span>
              Product
            </span>

            <span>
              Type
            </span>

            <span>
              Quantity
            </span>

            <span>
              Date
            </span>

          </div>

          {history.map((item) => (

            <div
              key={item._id}
              className="product-row"
            >

              <span>
                {item.product?.name}
              </span>

              <span>
                {item.type}
              </span>

              <span>
                {item.quantity}
              </span>

              <span>

                {
                  new Date(
                    item.createdAt
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

export default InventoryHistory;