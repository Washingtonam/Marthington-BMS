import { formatCurrency } from "../utils/formatters.js";

const TopProducts = ({
  products = []
}) => {

  return (

    <div className="tool-panel">

      <div className="panel-heading">
        <h2>Top Products</h2>
      </div>

      <div className="compact-list">

        {!products.length && (
          <div className="empty-state">
            No sales data yet
          </div>
        )}

        {products.map((product, index) => (

          <div
            key={index}
            className="compact-row"
          >

            <div>

              <strong>
                {product.name}
              </strong>

              <span>
                Sold: {product.qty}
              </span>

            </div>

            <span>

              {
                formatCurrency(
                  product.revenue
                )
              }

            </span>

          </div>
        ))}

      </div>

    </div>
  );
};

export default TopProducts;