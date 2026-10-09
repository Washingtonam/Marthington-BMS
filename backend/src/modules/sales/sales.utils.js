export const canDeleteSale = (user = {}) => {
  const role = user?.role;
  return role === 'owner' || role === 'super_admin';
};

export const canRestoreSale = (user = {}) => canDeleteSale(user);

export const PAYMENT_METHODS = Object.freeze(["cash", "card", "bank_transfer", "credit", "other"]);

export const normalizePaymentMethod = (value = "cash") => {
  const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "transfer" || normalized === "banktransfer") return "bank_transfer";
  if (normalized === "debt" || normalized === "credit_sale") return "credit";
  return PAYMENT_METHODS.includes(normalized) ? normalized : "other";
};

export const isCreditPayment = (value) => normalizePaymentMethod(value) === "credit";

export const shouldCreateInvoiceForSale = (paymentMethod) => isCreditPayment(paymentMethod);

export const buildProductCompensationEntries = (sale = {}, { businessId, branchId = null, createdBy = null, type = 'return', notePrefix = 'Sale reversal' } = {}) => {
  if (!sale || !Array.isArray(sale.items)) {
    return [];
  }

  return sale.items
    .filter((item) => item.itemType === 'product' || !item.itemType)
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const productId = item.product;

      if (!productId || quantity <= 0) {
        return null;
      }

      return {
        business: businessId,
        ...(branchId ? { branch: branchId } : {}),
        product: productId,
        type,
        quantity,
        unitCost: Number(item.costPrice || 0),
        note: `${notePrefix} ${sale._id || sale.receiptId || 'sale'}`,
        createdBy
      };
    })
    .filter(Boolean);
};

export const buildSaleLedgerEntry = ({ sale, businessId, createdBy = null, status = 'reversed', notePrefix = 'Sale reversal' } = {}) => {
  const totalAmount = Number(sale?.totalAmount || 0);
  const saleId = sale?._id || null;
  const receiptId = sale?.receiptId || 'sale';

  const profit = Array.isArray(sale?.items)
    ? sale.items.reduce((sum, item) => {
        const sellingPrice = Number(item.sellingPrice || 0);
        const costPrice = Number(item.costPrice || 0);
        const quantity = Number(item.quantity || 0);

        return sum + (sellingPrice - costPrice) * quantity;
      }, 0)
    : 0;

  return {
    businessId,
    transactionType: 'income',
    category: 'sales',
    description: `${notePrefix} ${receiptId}`,
    amount: totalAmount,
    profit,
    accountName: 'Sales Revenue',
    postingType: 'credit',
    sourceModel: 'Sale',
    sourceId: saleId,
    branchId: sale?.branch || null,
    status,
    occurredAt: new Date(),
    createdBy,
    isDeleted: false
  };
};

export const isDuplicateKeyError = (error) => {
  if (!error) return false;

  const message = String(error?.message || error || '');
  const normalized = message.toLowerCase();

  return (
    error?.code === 11000 ||
    error?.code === 11001 ||
    error?.codeName === 'DuplicateKey' ||
    normalized.includes('duplicate key') ||
    normalized.includes('e11000') ||
    normalized.includes('dup key')
  );
};

export const isTransactionAbortedError = (error) => {
  if (!error || isDuplicateKeyError(error)) return false;

  const message = String(error?.message || error || '');
  const normalized = message.toLowerCase();

  return (
    normalized.includes('transaction with { txnnumber:') && normalized.includes('has been aborted') ||
    normalized.includes('transaction has been aborted') ||
    normalized.includes('write conflict') ||
    normalized.includes('aborted transaction') ||
    error?.code === 251 ||
    error?.code === 112 ||
    error?.codeName === 'WriteConflict'
  );
};

export const normalizeSaleErrorMessage = (error) => {
  if (isTransactionAbortedError(error)) {
    return 'The sale transaction was aborted by the database. Please retry the sale.';
  }

  return error?.message || 'Failed to create sale';
};

export const buildPaymentApprovalMessage = ({ businessName = 'Business', sale = {}, receiptUrl = '' } = {}) => {
  const total = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(Number(sale.totalAmount || 0));

  return [
    `Payment confirmed by ${businessName}.`,
    `Order reference: ${sale.receiptId || sale._id || 'SALE'}`,
    `Total: ${total}`,
    receiptUrl ? `Receipt: ${receiptUrl}` : '',
    'Thank you for your patronage.'
  ].filter(Boolean).join('\n');
};

export const buildSalesQuery = ({
  businessId,
  isSuperAdmin = false,
  includeDeleted = false,
  canAccessDeleted = false,
  paymentStatus = null,
  status = null
} = {}) => {
  const query = {  };

  if (!isSuperAdmin) {
    query.business = businessId;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (status) {
    query.status = status;
  }

  if (includeDeleted) {
    if (!canAccessDeleted) {
      return { ...query, isDeleted: { $ne: true } };
    }
    return { ...query, isDeleted: true };
  }

  return { ...query, isDeleted: { $ne: true } };
};

export const buildSalesDateFilter = ({ startDate, endDate, timezoneOffset = 0 } = {}) => {
  if (!startDate && !endDate) return null;

  if (!Number.isInteger(timezoneOffset) || Math.abs(timezoneOffset) > 840) {
    return { error: "Timezone offset must be a whole number of minutes within 14 hours of UTC." };
  }

  const parseDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
  };

  const start = startDate ? parseDate(startDate) : null;
  const end = endDate ? parseDate(endDate) : null;
  if ((startDate && !start) || (endDate && !end)) {
    return { error: "Dates must use the YYYY-MM-DD format and be valid calendar dates." };
  }
  if (start && end && start > end) {
    return { error: "Start date must be on or before end date." };
  }

  const createdAt = {};
  const offsetMilliseconds = timezoneOffset * 60 * 1000;
  if (start) createdAt.$gte = new Date(start.getTime() + offsetMilliseconds);
  if (end) createdAt.$lt = new Date(end.getTime() + 24 * 60 * 60 * 1000 + offsetMilliseconds);
  return { createdAt };
};

export const getCustomerSaleImpact = ({ paymentMethod = 'cash', totalAmount = 0, action = 'delete' } = {}) => {
  const amount = Number(totalAmount || 0);
  const isDelete = action === 'delete';
  const isCredit = isCreditPayment(paymentMethod);

  return {
    totalSpentDelta: isDelete ? -amount : amount,
    totalOrdersDelta: isDelete ? -1 : 1,
    outstandingBalanceDelta: isCredit ? (isDelete ? -amount : amount) : 0
  };
};
