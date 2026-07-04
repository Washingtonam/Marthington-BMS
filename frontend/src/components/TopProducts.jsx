import { formatCurrency } from "../utils/formatters.js";

const TopProducts = ({ products = [], averageOrderValue = 0 }) => {
  return (
    <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Top Products</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Best-performing items</p>
        </div>
        <div className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
          Avg. Order {formatCurrency(averageOrderValue)}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
        {!products.length && (
          <div className="flex min-h-[140px] items-center justify-center bg-slate-50 px-4 text-sm font-semibold text-slate-500">
            No sales data yet
          </div>
        )}

        {products.length > 0 && (
          <div className="divide-y divide-slate-100 bg-white">
            <div className="flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              <span>Product</span>
              <span>Sales</span>
            </div>

            {products.map((product, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Sold: {product.qty ?? product.quantitySold ?? 0}</p>
                </div>
                <span className="text-sm font-black text-slate-900">
                  {formatCurrency(product.revenue ?? product.totalRevenue ?? 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopProducts;