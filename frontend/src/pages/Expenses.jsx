import { useEffect, useState, useMemo, useRef } from "react";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const EXPENSE_CATEGORIES = [
  { value: "inventory", label: "Inventory/Stock Procurement" },
  { value: "logistics", label: "Logistics & Transport" },
  { value: "utilities", label: "Utilities & Power" },
  { value: "salaries", label: "Staff Wages/Salaries" },
  { value: "rent", label: "Rent & Space Maintenance" },
  { value: "marketing", label: "Marketing/Creatives" },
  { value: "miscellaneous", label: "Miscellaneous / Others" }
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "store_credit", label: "Store Credit" }
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "miscellaneous",
    paymentMethod: "cash",
    date: new Date().toISOString().split("T")[0],
    receipt: null
  });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateRange, setDateRange] = useState("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());

  // ====================================
  // DATA LOADING
  // ====================================
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true);
        const data = await request("/expenses");
        setExpenses(Array.isArray(data) ? data : data?.expenses || []);
      } catch (err) {
        setStatusMsg({ type: "error", text: "Failed to load expenses." });
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, []);

  // ====================================
  // COMPUTED METRICS
  // ====================================
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });

    const lastMonthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === lastMonthYear;
    });

    const totalCurrentMonth = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Top category
    const categoryTotals = {};
    currentMonthExpenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const topCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];

    // MoM change
    const momChange = totalLastMonth === 0 ? 0 : ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100;

    return {
      totalCurrentMonth,
      topCategory: topCategory ? EXPENSE_CATEGORIES.find(c => c.value === topCategory[0])?.label : "N/A" : "N/A",
      momChange
    };
  }, [expenses]);

  // ====================================
  // FILTERING
  // ====================================
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    // Date range filter
    const now = new Date();
    let startDate = new Date();

    if (dateRange === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === "week") {
      startDate.setDate(now.getDate() - now.getDay());
    } else if (dateRange === "month") {
      startDate.setDate(1);
    }

    filtered = filtered.filter(e => new Date(e.date) >= startDate);

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, searchTerm, selectedCategory, dateRange]);

  // ====================================
  // ACTIONS
  // ====================================
  const handleAddExpense = async () => {
    if (!formData.amount || !formData.description) {
      setStatusMsg({ type: "error", text: "Amount and description required." });
      return;
    }

    try {
      setProcessing(true);
      const payload = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        date: formData.date
      };

      const res = await request("/expenses", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res?.expense) {
        setExpenses([res.expense, ...expenses]);
        setFormData({
          amount: "",
          description: "",
          category: "miscellaneous",
          paymentMethod: "cash",
          date: new Date().toISOString().split("T")[0],
          receipt: null
        });
        setIsFormOpen(false);
        setStatusMsg({ type: "success", text: "Expense added successfully!" });
        setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      }
    } catch (err) {
      setStatusMsg({ type: "error", text: err.message || "Failed to add expense." });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await request(`/expenses/${id}`, { method: "DELETE" });
      setExpenses(expenses.filter(e => e._id !== id));
      setStatusMsg({ type: "success", text: "Expense deleted." });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 2000);
    } catch (err) {
      setStatusMsg({ type: "error", text: "Failed to delete expense." });
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedExpenses.size || !confirm(`Delete ${selectedExpenses.size} expense(s)?`)) return;
    try {
      await Promise.all([...selectedExpenses].map(id => request(`/expenses/${id}`, { method: "DELETE" })));
      setExpenses(expenses.filter(e => !selectedExpenses.has(e._id)));
      setSelectedExpenses(new Set());
      setStatusMsg({ type: "success", text: `${selectedExpenses.size} expense(s) deleted.` });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 2000);
    } catch (err) {
      setStatusMsg({ type: "error", text: "Bulk delete failed." });
    }
  };

  const handleBulkExport = () => {
    if (filteredExpenses.length === 0) {
      setStatusMsg({ type: "error", text: "No expenses to export." });
      return;
    }

    const headers = ["Date", "Description", "Category", "Payment Method", "Amount"];
    const rows = filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.description,
      EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category,
      PAYMENT_METHODS.find(m => m.value === e.paymentMethod)?.label || e.paymentMethod,
      `₦${e.amount.toLocaleString()}`
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleExpenseSelection = (id) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedExpenses(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map(e => e._id)));
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <section className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-gray-900">Expenses</h1>
            <p className="text-sm text-gray-500 mt-1">Track and manage all business expenses</p>
          </div>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg"
          >
            + Add Expense
          </button>
        </div>

        {/* STATUS MESSAGE */}
        {statusMsg.text && (
          <div className={`px-4 py-3 rounded-xl text-sm font-bold ${
            statusMsg.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* INSIGHTS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Total Expenses</p>
            <p className="text-3xl font-black text-gray-900">{formatCurrency(metrics.totalCurrentMonth)}</p>
            <p className="text-xs text-gray-400 mt-2">This month</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Top Category</p>
            <p className="text-2xl font-black text-gray-900 truncate">{metrics.topCategory}</p>
            <p className="text-xs text-gray-400 mt-2">Highest spending</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">MoM Change</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black ${metrics.momChange >= 0 ? "text-red-500" : "text-green-600"}`}>
                {Math.abs(metrics.momChange).toFixed(1)}%
              </p>
              <p className={`text-xs font-bold ${metrics.momChange >= 0 ? "text-red-500" : "text-green-600"}`}>
                {metrics.momChange >= 0 ? "↑ Up" : "↓ Down"}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">vs. last month</p>
          </div>
        </div>

        {/* ADD EXPENSE FORM */}
        {isFormOpen && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Add New Expense</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Amount (₦)"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              />
              
              <input
                type="text"
                placeholder="Description (e.g., 'Generator Diesel')"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              />

              <select
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>

              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={e => setFormData({...formData, receipt: e.target.files?.[0] || null})}
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddExpense}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {processing ? "Adding..." : "Add Expense"}
              </button>
              <button
                onClick={() => setIsFormOpen(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* FILTERS & CONTROLS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
            />

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {selectedExpenses.size > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition-all"
              >
                🗑️ Delete ({selectedExpenses.size})
              </button>
              <button
                onClick={handleBulkExport}
                className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 font-bold rounded-xl text-sm transition-all"
              >
                📥 Export ({selectedExpenses.size})
              </button>
            </div>
          )}
        </div>

        {/* EXPENSE LEDGER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 font-bold">No expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700">Expense Details</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700">Category</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700">Payment Method</th>
                    <th className="px-6 py-3 text-right font-bold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map(expense => (
                    <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.has(expense._id)}
                          onChange={() => toggleExpenseSelection(expense._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <p className="font-semibold">{expense.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">
                          {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-semibold">
                        {PAYMENT_METHODS.find(m => m.value === expense.paymentMethod)?.label || expense.paymentMethod}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(expense._id)}
                          className="text-red-500 hover:text-red-700 font-bold transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Expenses;
