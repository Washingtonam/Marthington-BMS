export const chooseMergeValue = (primary, secondary, policy, primaryWeight = 0, secondaryWeight = 0) => {
  if (primary === null || primary === undefined) return secondary ?? null;
  if (secondary === null || secondary === undefined) return primary;
  if (policy === "secondary") return secondary;
  if (policy === "highest") return Math.max(primary, secondary);
  if (policy === "lowest") return Math.min(primary, secondary);
  if (policy === "weighted-average") {
    const totalWeight = primaryWeight + secondaryWeight;
    return totalWeight > 0
      ? Number((((primary * primaryWeight) + (secondary * secondaryWeight)) / totalWeight).toFixed(2))
      : Number(((primary + secondary) / 2).toFixed(2));
  }
  return primary;
};

export const chooseMergeStock = (primary, secondary, policy) => {
  if (policy === "secondary") return secondary;
  if (policy === "sum") return primary + secondary;
  return primary;
};

export const chooseMergeStockFromProducts = (products, policy, survivorId) => {
  if (policy === "sum") return products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  if (policy === "primary") return Number(products.find((product) => String(product._id) === String(survivorId))?.stock || 0);
  if (policy === "secondary") return Number(products[1]?.stock || 0);
  return Number(products.find((product) => String(product._id) === String(policy))?.stock || 0);
};

export const chooseMergeFieldFromProducts = (products, policy, field, weights = []) => {
  if (policy === "highest") return Math.max(...products.map((product) => Number(product[field] || 0)));
  if (policy === "lowest") return Math.min(...products.map((product) => Number(product[field] || 0)));
  if (policy === "weighted-average") {
    const totalWeight = weights.reduce((sum, weight) => sum + Number(weight || 0), 0);
    if (totalWeight === 0) {
      return Number((products.reduce((sum, product) => sum + Number(product[field] || 0), 0) / products.length).toFixed(2));
    }
    return Number((products.reduce((sum, product, index) =>
      sum + (Number(product[field] || 0) * Number(weights[index] || 0)), 0
    ) / totalWeight).toFixed(2));
  }
  return Number(products.find((product) => String(product._id) === String(policy))?.[field] || 0);
};

export const canManageGlobalCatalog = (user = {}) => user.role === "owner"
  || user.role === "super_admin"
  || (user.permissions?.canManageProducts === true
    && user.permissions?.canManageAllBranchInventory === true);
