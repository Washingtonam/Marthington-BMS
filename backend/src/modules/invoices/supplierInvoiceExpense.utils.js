export const buildSupplierInvoiceExpense = ({
  invoice,
  userId,
  expenseCategory,
  expensePaymentMethod,
  expenseDate,
  expenseDescription,
  expenseBudgetAllocation,
  expenseInventoryItems = []
}) => ({
  business: invoice.business,
  branch: invoice.branch,
  amount: invoice.totalAmount,
  description: String(
    expenseDescription ||
    invoice.items.map((item) => item.name).filter(Boolean).join(", ") ||
    `Supplier invoice ${invoice.invoiceNumber}`
  ).trim(),
  category: expenseCategory || (invoice.items.some((item) => item.product) ? "inventory" : "miscellaneous"),
  paymentMethod: expensePaymentMethod || (invoice.balanceDue > 0 ? "store_credit" : "cash"),
  budgetAllocation: expenseBudgetAllocation ?? null,
  date: expenseDate ? new Date(expenseDate) : new Date(),
  notes: invoice.notes || "",
  createdBy: userId,
  status: "pending",
  linkedInvoice: invoice._id,
  supplier: invoice.supplier,
  inventoryItems: expenseInventoryItems.map((item) => ({
    product: item.product || item.productId || null,
    productName: item.productName || item.name || "",
    quantity: Number(item.quantity || 0),
    unitCost: Number(item.unitCost || 0),
    inventoryUpdated: Boolean(item.inventoryUpdated)
  }))
});