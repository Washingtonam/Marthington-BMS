const normalizeHeader = (header) => String(header).toLowerCase().replace(/[^a-z0-9]/g, "");

const parseAmount = (row, key, aliases, rowNumber) => {
  const sourceKey = [key, ...aliases].map(normalizeHeader).find((header) =>
    row.has(header) && row.get(header) !== undefined && row.get(header) !== null && row.get(header) !== ""
  );
  if (!sourceKey) return null;
  const amount = Number(row.get(sourceKey));
  if (!Number.isFinite(amount) || amount < 0) {
    throw Object.assign(new Error(`Invalid ${key} on row ${rowNumber}. Use a non-negative number.`), { statusCode: 400 });
  }
  return amount;
};

export const parseProductImportRows = (rows) => {
  const stagedRows = [];
  for (const [index, rawRow] of rows.entries()) {
    const row = new Map(
      Object.entries(rawRow).map(([header, value]) => [normalizeHeader(header), value])
    );
    const getCell = (...headers) => {
      for (const header of headers) {
        const value = row.get(normalizeHeader(header));
        if (value !== undefined && value !== null && value !== "") return value;
      }
      return null;
    };
    const rowNumber = index + 2;
    const name = String(getCell("name", "productName", "itemName") || "").trim();
    if (!name) continue;
    if (name.length > 200) {
      throw Object.assign(new Error(`Product name on row ${rowNumber} exceeds 200 characters.`), { statusCode: 400 });
    }

    stagedRows.push({
      rowNumber,
      name,
      category: String(getCell("category") || "").trim().slice(0, 100),
      sku: String(getCell("sku", "barcode", "productCode") || "").trim().slice(0, 100),
      stock: parseAmount(row, "stock", ["quantity", "stockQuantity"], rowNumber),
      sellingPrice: parseAmount(row, "sellingPrice", ["price"], rowNumber),
      costPrice: parseAmount(row, "costPrice", ["cost", "unitCost"], rowNumber)
    });
  }
  return stagedRows;
};
