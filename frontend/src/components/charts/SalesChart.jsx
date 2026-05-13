import React from "react";
// Direct imports are safer for Vite production builds to avoid circular deps
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import { formatCurrency } from "../../utils/formatters.js";

const SalesChart = ({ data = [] }) => {
  // 1. We define a constant height and minWidth to prevent the -1 width error.
  // 2. We add a check for data length to avoid rendering an empty chart which sometimes triggers the error.
  
  return (
    <div className="tool-panel bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="panel-heading mb-4">
        <h2 className="text-lg font-bold text-gray-800">Sales Trend</h2>
      </div>

      <div className="w-full" style={{ height: "350px", minWidth: "0" }}>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />

              <YAxis 
                tickFormatter={(v) => `₦${v}`} 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />

              <Tooltip
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                }}
                formatter={(value) => formatCurrency(value)}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb" // Steve Computer Warehouse Blue
                strokeWidth={4}
                dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-400 italic">
            Insufficient data to plot trend...
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;