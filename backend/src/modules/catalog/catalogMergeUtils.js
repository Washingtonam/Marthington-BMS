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

export const canManageGlobalCatalog = (user = {}) => user.role === "owner"
  || user.role === "super_admin"
  || (user.permissions?.canManageProducts === true
    && user.permissions?.canManageAllBranchInventory === true);
