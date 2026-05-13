const MetricCard = ({ icon, label, value, tone }) => {
  // Define tone colors (example)
  const colors = {
    revenue: "bg-blue-50 text-blue-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-orange-50 text-orange-600",
    neutral: "bg-gray-50 text-gray-600"
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-3">
        {/* Icon & Label Row */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colors[tone] || colors.neutral}`}>
            {icon}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 leading-none">
            {label}
          </span>
        </div>

        {/* Value Row - Now on its own line to prevent overflow */}
        <div className="pt-1">
          <h3 className="text-xl font-black text-gray-900 truncate" title={value}>
            {value}
          </h3>
        </div>
      </div>
    </div>
  );
};