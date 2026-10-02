export const buildSupplierInvoiceProduct = ({ businessId, item = {} }) => {
  const name = String(item.name || "").trim();
  const costPrice = Number(item.price ?? 0);
  const sellingPrice = Number(item.sellingPrice ?? 0);

  if (!name) throw new Error("New supplier products must have a name.");
  if (!Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
    throw new Error(`Invalid purchase or selling price for ${name}.`);
  }

  return {
    business: businessId,
    name,
    category: String(item.category || "General").trim() || "General",
    costPrice,
    price: sellingPrice,
    stock: 0,
    sku: `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  };
};