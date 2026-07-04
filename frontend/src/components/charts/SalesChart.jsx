import React from "react";
// 1. Cleaned up imports: removed duplicate line and non-existent Defs/LinearGradient
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from "recharts";
import { formatCurrency } from "../../utils/formatters.js";

// Custom Tooltip to match Marthington's UI style
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 min-w-[150px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center gap-4 py-1">
            <span className="text-xs font-bold text-gray-500">{entry.name}:</span>
            <span className="text-sm font-black text-gray-900">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SalesChartContent = ({ data = [] }) => {
  return (
    <div style={{ width: "100%", height: "350px", minHeight: "350px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          {/* 2. Using standard lowercase SVG tags for gradients */}
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(148, 163, 184, 0.16)" />
          
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
            axisLine={false}
            tickLine={false}
            dy={10}
            interval="preserveStartEnd"
            minTickGap={24}
            tickFormatter={(value) => {
              const date = new Date(value);
              if (Number.isNaN(date.getTime())) return value;
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />
          
          <YAxis 
            tickFormatter={(v) => `₦${v >= 1000 ? v/1000 + 'k' : v}`}
            tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }} />
          
          <Area
            name="Revenue"
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRev)"
            activeDot={{ r: 6, strokeWidth: 0 }}
          />

          <Area
            name="Profit"
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorProfit)"
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const SalesChart = ({ data = [] }) => {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Revenue Analysis</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Daily performance tracking</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Profit</span>
          </div>
        </div>
      </div>

      {data && data.length > 0 ? (
        <SalesChartContent data={data} />
      ) : (
        <div className="h-[350px] w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-[1.5rem] border-2 border-dashed border-gray-100">
          <span className="text-3xl mb-2">📊</span>
          <p className="text-sm font-bold uppercase tracking-widest">No data available yet</p>
        </div>
      )}
    </div>
  );
};

export default SalesChart;