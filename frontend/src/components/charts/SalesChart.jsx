import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { formatCurrency } from "../../utils/formatters.js";

const SalesChart = ({ data = [] }) => {

  return (

    <div className="tool-panel">

      <div className="panel-heading">
        <h2>Sales Trend</h2>
      </div>

      <div style={{ width: "100%", height: 300 }}>

        <ResponsiveContainer>

          <LineChart data={data}>

            <XAxis dataKey="date" />

            <YAxis tickFormatter={(v) => `₦${v}`} />

            <Tooltip
              formatter={(value) =>
                formatCurrency(value)
              }
            />

            <Line
              type="monotone"
              dataKey="revenue"
              strokeWidth={3}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
};

export default SalesChart;