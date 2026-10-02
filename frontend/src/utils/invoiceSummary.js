export const buildInvoiceSummary = (invoices = [], now = new Date()) => {
  const activeInvoices = invoices.filter((invoice) => invoice.status !== "cancelled");

  return activeInvoices.reduce((summary, invoice) => {
    const totalAmount = Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.returnedAmount || 0));
    const amountPaid = Math.min(Number(invoice.amountPaid || 0), totalAmount);
    const balanceDue = Number(invoice.balanceDue || 0);
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const isOverdue = dueDate && dueDate < now && invoice.status !== "paid" && invoice.paymentStatus !== "Fully Paid";

    summary.totalBalanceDue += balanceDue;
    summary.totalAmount += totalAmount;
    summary.totalCollected += amountPaid;
    summary.pendingAmount += balanceDue;

    if (invoice.paymentStatus === "Fully Paid") summary.paidCount += 1;
    else if (invoice.paymentStatus !== "Returned") summary.pendingCount += 1;

    if (isOverdue) {
      summary.overdueAmount += balanceDue;
      summary.overdueCount += 1;
    }

    return summary;
  }, {
    totalBalanceDue: 0,
    totalAmount: 0,
    totalCollected: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });
};

export const resolveInvoiceSummary = (invoices = [], serverSummary = {}, now = new Date()) => {
  const computedSummary = buildInvoiceSummary(invoices, now);

  return Object.keys(computedSummary).reduce((summary, key) => {
    const serverValue = Number(serverSummary?.[key] ?? Number.NaN);
    const computedValue = Number(computedSummary[key] ?? 0);
    const hasMeaningfulServerValue = Number.isFinite(serverValue) && (serverValue > 0 || computedValue === 0);

    summary[key] = hasMeaningfulServerValue ? serverValue : computedValue;
    return summary;
  }, { ...computedSummary });
};