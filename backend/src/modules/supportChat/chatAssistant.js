import Customer from "../customers/customer.model.js";
import Invoice from "../invoices/invoice.model.js";
import Product from "../products/product.model.js";
import BranchInventory from "../branches/branchInventory.model.js";

export const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getBusinessGuideAnswer = (question) => {
  const text = String(question || "").toLowerCase();
  if (/\b(stock|inventory|product|products)\b/.test(text)) {
    return "To manage stock, open Products or Inventory from the sidebar. You can search for an item there to see its current quantity, edit its details, or record a stock adjustment.";
  }
  if (/\b(invoice|invoices|quotation)\b/.test(text)) {
    return "Open Invoices from the sidebar to create and track invoices, quotations, payments, and outstanding balances. If Invoices is unavailable on your plan, ask your business owner or administrator.";
  }
  if (/\b(customer|customers|buyer|buyers|crm)\b/.test(text)) {
    return "Open Customers / CRM from the sidebar to find customer profiles, purchase history, and balances. Use the search field to locate a customer.";
  }
  if (/\b(report|reports|analytics|sales|revenue)\b/.test(text)) {
    return "Open Reports or Analytics from the sidebar to review sales and business performance. Choose a date range to focus the report on a period.";
  }
  if (/\b(staff|user|users|permission|permissions)\b/.test(text)) {
    return "Business owners can manage team members and access from Staff and Settings → Roles & Permissions. Available actions depend on each team member's permissions.";
  }
  return "I can help with current product stock, top customers, outstanding invoices, and basic guides. Try asking “How many units of [product] are in stock?”, “Who are my top buyers?”, or “Which invoices are unpaid?” You can switch to Chat with support for help from the Marthington team.";
};

const formatMoney = (value) => `₦${Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const extractProductName = (question) => String(question || "")
  .replace(/\b(?:how many|what is|what's|show me|check|tell me|please|the|current|available|left|in stock|stock|inventory|quantity|units?|of|for|product|products|do we have|do i have|any)\b/gi, " ")
  .replace(/[?.,!]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export const getAssistantAnswer = async ({ businessId, branchId = null, branchScoped = false, question, permissions = {} }) => {
  const normalized = String(question || "").trim();
  const lower = normalized.toLowerCase();
  if (!normalized) return "Ask me a question about this business, and I’ll look it up.";

  if (/\b(stock|inventory|product|products)\b/.test(lower)) {
    if (permissions.canViewProducts !== true) return "Your account doesn’t have permission to view product inventory. Ask your business owner to enable product access or switch to Chat with support.";
    const name = extractProductName(normalized);
    if (!name) {
      const [productCount, lowStock] = await Promise.all([
        Product.countDocuments({ business: businessId }),
        branchScoped && branchId
          ? BranchInventory.find({ business: businessId, branch: branchId, quantity: { $lte: 5 } })
            .select("quantity product")
            .sort({ quantity: 1 })
            .limit(8)
            .populate("product", "name")
            .lean()
          : Product.find({ business: businessId, stock: { $lte: 5 } })
            .select("name stock")
            .sort({ stock: 1, name: 1 })
            .limit(8)
            .lean()
      ]);
      const lowStockSummary = lowStock.length
        ? lowStock.map((product) => `${branchId ? product.product?.name || "Product" : product.name}: ${Number(branchId ? product.quantity : product.stock || 0)}`).join("; ")
        : "No products with 5 or fewer units";
      return `There are ${productCount} products in your catalog. ${lowStockSummary}. Ask for a specific product to check its exact stock.`;
    }

    const products = await Product.find({
      business: businessId,
      name: { $regex: escapeRegex(name), $options: "i" }
    }).select("name stock").sort({ name: 1 }).limit(5).lean();
    if (!products.length) return `I couldn't find a product matching “${name}” in this business's catalog. Check the product name or open Products to search manually.`;
    const branchStock = branchScoped && branchId
      ? new Map((await BranchInventory.find({
        business: businessId,
        branch: branchId,
        product: { $in: products.map((product) => product._id) }
      }).select("product quantity").lean()).map((entry) => [String(entry.product), Number(entry.quantity || 0)]))
      : null;
    const productStock = (product) => branchStock ? branchStock.get(String(product._id)) || 0 : Number(product.stock || 0);
    if (products.length > 1) return `I found several matching products: ${products.map((product) => `${product.name} (${productStock(product)} in stock)`).join("; ")}. Which one did you mean?`;
    return `${products[0].name} currently has ${productStock(products[0])} units in stock${branchScoped && branchId ? " at your branch" : ""}.`;
  }

  if (/\b(top buyers|top customers|best customers|highest spending|who.*(?:buy|spend)|customer.*(?:spend|buy)|(?:top|best|biggest|highest|most).*(?:customer|buyer))\b/.test(lower)) {
    if (permissions.canViewCustomers !== true) return "Your account doesn’t have permission to view customer records. Ask your business owner to enable customer access or switch to Chat with support.";
    const customers = await Customer.find({ business: businessId, ...(branchScoped ? { branch: branchId } : {}), isActive: { $ne: false } })
      .select("name totalSpent totalOrders")
      .sort({ totalSpent: -1, totalOrders: -1 })
      .limit(5)
      .lean();
    if (!customers.length) return "There are no customer profiles with purchase totals recorded yet.";
    return `Your top buyers by recorded spend are: ${customers.map((customer, index) => `${index + 1}. ${customer.name} (${formatMoney(customer.totalSpent)} across ${Number(customer.totalOrders || 0)} orders)`).join("; ")}.`;
  }

  if (/\b(invoice|invoices|unpaid|outstanding balance|overdue)\b/.test(lower)) {
    if (permissions.canViewInvoices !== true) return "Your account doesn’t have permission to view invoices. Ask your business owner to enable invoice access or switch to Chat with support.";
    const filter = {
      business: businessId,
      ...(branchScoped ? { branch: branchId } : {}),
      transactionType: "outgoing",
      status: { $in: ["draft", "sent", "partial", "overdue"] },
      balanceDue: { $gt: 0 }
    };
    const [count, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .select("invoiceNumber customerName balanceDue dueDate status")
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(5)
        .lean()
    ]);
    if (!count) return "There are no outstanding customer invoices right now.";
    const totalDue = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
    return `${count} customer invoice${count === 1 ? "" : "s"} have an outstanding balance. The ${invoices.length} most recent include ${invoices.map((invoice) => `${invoice.invoiceNumber || "Invoice"} for ${invoice.customerName || "a customer"} (${formatMoney(invoice.balanceDue)} due, ${invoice.status})`).join("; ")}. Those listed invoices total ${formatMoney(totalDue)}; open Invoices for the full list.`;
  }

  return getBusinessGuideAnswer(normalized);
};
