import Expense from "./expense.model.js";
import Business from "../businesses/business.model.js";

// 🔥 CREATE EXPENSE
const createExpense = async (req, res) => {
  try {
    const { amount, description, category, paymentMethod, date, notes } = req.body;
    const businessId = req.user.businessId;

    // Validate required fields
    if (!amount || !description) {
      return res.status(400).json({ message: "Amount and description are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Check business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Create expense
    const expense = await Expense.create({
      business: businessId,
      amount: parseFloat(amount),
      description: description.trim(),
      category: category || "miscellaneous",
      paymentMethod: paymentMethod || "cash",
      date: date ? new Date(date) : new Date(),
      notes: notes || "",
      createdBy: req.user.id,
      status: "pending"
    });

    await expense.populate("createdBy", "name email");

    return res.status(201).json({
      message: "Expense created successfully",
      expense
    });
  } catch (err) {
    console.error("Create Expense Error:", err);
    return res.status(500).json({ message: err.message || "Failed to create expense" });
  }
};

// 🔥 GET ALL EXPENSES (WITH FILTERS)
const getExpenses = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { category, startDate, endDate, paymentMethod, status } = req.query;

    // Build filter
    const filter = { business: businessId };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const expenses = await Expense.find(filter)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ date: -1 })
      .exec();

    // Calculate summary metrics
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryTotals = {};
    const methodTotals = {};

    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      methodTotals[e.paymentMethod] = (methodTotals[e.paymentMethod] || 0) + e.amount;
    });

    return res.status(200).json({
      count: expenses.length,
      totalAmount,
      categoryTotals,
      methodTotals,
      expenses
    });
  } catch (err) {
    console.error("Get Expenses Error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch expenses" });
  }
};

// 🔥 GET SINGLE EXPENSE
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const expense = await Expense.findOne({ _id: id, business: businessId })
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .exec();

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json(expense);
  } catch (err) {
    console.error("Get Expense Error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch expense" });
  }
};

// 🔥 UPDATE EXPENSE
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    const { amount, description, category, paymentMethod, date, notes, status } = req.body;

    const expense = await Expense.findOne({ _id: id, business: businessId });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Only owner/admin can change status
    if (status && req.user.role !== "owner" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Unauthorized to change expense status" });
    }

    if (amount !== undefined) {
      if (amount <= 0) return res.status(400).json({ message: "Amount must be > 0" });
      expense.amount = parseFloat(amount);
    }

    if (description) expense.description = description.trim();
    if (category) expense.category = category;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (date) expense.date = new Date(date);
    if (notes !== undefined) expense.notes = notes;
    if (status) {
      expense.status = status;
      if (status === "approved") {
        expense.approvedBy = req.user.id;
      }
    }

    await expense.save();
    await expense.populate("createdBy", "name email");
    await expense.populate("approvedBy", "name email");

    return res.status(200).json({
      message: "Expense updated successfully",
      expense
    });
  } catch (err) {
    console.error("Update Expense Error:", err);
    return res.status(500).json({ message: err.message || "Failed to update expense" });
  }
};

// 🔥 DELETE EXPENSE
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const expense = await Expense.findOneAndDelete({ _id: id, business: businessId });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json({
      message: "Expense deleted successfully",
      expenseId: id
    });
  } catch (err) {
    console.error("Delete Expense Error:", err);
    return res.status(500).json({ message: err.message || "Failed to delete expense" });
  }
};

// 🔥 BULK DELETE EXPENSES
const bulkDeleteExpenses = async (req, res) => {
  try {
    const { ids } = req.body;
    const businessId = req.user.businessId;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No expenses selected for deletion" });
    }

    const result = await Expense.deleteMany({ _id: { $in: ids }, business: businessId });

    return res.status(200).json({
      message: `${result.deletedCount} expense(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Bulk Delete Error:", err);
    return res.status(500).json({ message: err.message || "Failed to delete expenses" });
  }
};

// 🔥 GET EXPENSE SUMMARY (FOR DASHBOARD/REPORTS)
const getExpenseSummary = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate } = req.query;

    const filter = { business: businessId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const expenses = await Expense.find(filter);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const categoryBreakdown = {};
    const CATEGORIES = ["inventory", "logistics", "utilities", "salaries", "rent", "marketing", "miscellaneous"];
    
    CATEGORIES.forEach(cat => {
      const catTotal = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      if (catTotal > 0) {
        categoryBreakdown[cat] = catTotal;
      }
    });

    // Get top category
    const topCategory = Object.entries(categoryBreakdown).sort(([,a], [,b]) => b - a)[0];

    // Get month-over-month comparison
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthExpenses = expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
    });

    const lastMonthExpenses = expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === lastMonth && eDate.getFullYear() === lastMonthYear;
    });

    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const momChange = lastMonthTotal === 0 ? 0 : ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

    return res.status(200).json({
      totalExpenses,
      currentMonthTotal,
      lastMonthTotal,
      momChange: Math.round(momChange * 100) / 100,
      topCategory: topCategory ? { category: topCategory[0], amount: topCategory[1] } : null,
      categoryBreakdown,
      expenseCount: expenses.length
    });
  } catch (err) {
    console.error("Get Summary Error:", err);
    return res.status(500).json({ message: err.message || "Failed to get expense summary" });
  }
};

export default {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  bulkDeleteExpenses,
  getExpenseSummary
};
