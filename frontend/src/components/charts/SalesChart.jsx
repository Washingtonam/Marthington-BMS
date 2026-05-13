import React, { Suspense, lazy } from "react";
import { formatCurrency } from "../../utils/formatters.js";

// We import the specific components directly to help the bundler
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

const SalesChartContent = ({ data = [] }) => {
  return (
    // Explicitly set height in pixels to satisfy the ResponsiveContainer
    <div style={{ width: "100%", height: "350px", minHeight: "350px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={(v) => `₦${v}`}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={4}
            dot={{ r: 4, fill: "#2563eb" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Component with logic to handle data states
const SalesChart = ({ data = [] }) => {
  return (
    <div className="tool-panel bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="panel-heading mb-4">
        <h2 className="text-lg font-bold text-gray-800">Sales Trend</h2>
      </div>

      {data && data.length > 0 ? (
        <SalesChartContent data={data} />
      ) : (
        <div className="h-[350px] w-full flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-2xl">
          No transaction history available...
        </div>
      )}
    </div>
  );
};

export default SalesChart;