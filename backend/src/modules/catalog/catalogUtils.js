export const normalizeCatalogName = (value = "") => {
  if (value === null || value === undefined) return "";

  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const pickPreferredCatalogName = (currentName = "", incomingName = "") => {
  const first = String(currentName || "").trim();
  const second = String(incomingName || "").trim();

  if (!first) return second;
  if (!second) return first;

  const firstNorm = normalizeCatalogName(first);
  const secondNorm = normalizeCatalogName(second);

  if (!firstNorm) return second;
  if (!secondNorm) return first;

  const firstWords = firstNorm.split(" ").filter(Boolean).length;
  const secondWords = secondNorm.split(" ").filter(Boolean).length;

  if (secondWords > firstWords) return second;
  if (secondWords < firstWords) return first;
  if (secondNorm.length > firstNorm.length) return second;

  return first;
};

export const mergeCatalogValues = (existing = {}, incoming = {}) => {
  const base = existing || {};
  const next = incoming || {};
  const preferredName = pickPreferredCatalogName(base.name, next.name);

  const currentPrice = Number(base.price ?? base.sellingPrice ?? 0) || 0;
  const incomingPrice = Number(next.price ?? next.sellingPrice ?? 0) || 0;
  const preferredPrice = currentPrice && incomingPrice ? Math.max(currentPrice, incomingPrice) : (currentPrice || incomingPrice);

  const currentCost = Number(base.costPrice || 0) || 0;
  const incomingCost = Number(next.costPrice || 0) || 0;
  const preferredCost = currentCost && incomingCost ? Math.min(currentCost, incomingCost) : (currentCost || incomingCost);

  const mergedStock = (Number(base.stock || 0) || 0) + (Number(next.stock || 0) || 0);

  return {
    ...base,
    ...next,
    name: preferredName || base.name || next.name,
    price: preferredPrice || 0,
    costPrice: preferredCost || 0,
    stock: mergedStock
  };
};

export const findCatalogMatch = (items = [], incomingName = "") => {
  const target = normalizeCatalogName(incomingName);
  if (!target) return null;

  for (const item of items) {
    const candidate = normalizeCatalogName(item?.name || "");
    if (candidate && candidate === target) return item;
  }

  return null;
};

const levenshteinDistance = (first, second, maximumDistance) => {
  if (Math.abs(first.length - second.length) > maximumDistance) return maximumDistance + 1;

  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex];
    let rowMinimum = firstIndex;

    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        current[secondIndex - 1] + 1,
        previous[secondIndex - 1] + substitutionCost
      );
      rowMinimum = Math.min(rowMinimum, current[secondIndex]);
    }

    if (rowMinimum > maximumDistance) return maximumDistance + 1;
    previous = current;
  }
  return previous[second.length];
};

const isSimilarCatalogName = (first, second) => {
  if (!first || !second || first === second || Math.min(first.length, second.length) < 4) return false;
  const shorter = first.length <= second.length ? first : second;
  const longer = first.length <= second.length ? second : first;

  if (longer.includes(shorter) && shorter.length / longer.length >= 0.8) return true;

  const maximumDistance = Math.max(1, Math.floor(Math.max(first.length, second.length) * 0.15));
  return levenshteinDistance(first, second, maximumDistance) <= maximumDistance;
};

const getDeletionSignatures = (value) => {
  const signatures = new Set([value]);
  for (let first = 0; first < value.length; first += 1) {
    signatures.add(value.slice(0, first) + value.slice(first + 1));
    for (let second = first + 1; second < value.length; second += 1) {
      signatures.add(value.slice(0, first) + value.slice(first + 1, second) + value.slice(second + 1));
    }
  }
  return signatures;
};

export const findSimilarCatalogGroups = (items = [], maxGroups = 200) => {
  const productsByName = new Map();
  for (const item of items) {
    const normalizedName = normalizeCatalogName(item?.name || "");
    if (!normalizedName) continue;
    const group = productsByName.get(normalizedName) || [];
    group.push(item);
    productsByName.set(normalizedName, group);
  }

  const groups = [...productsByName.entries()]
    .filter(([, products]) => products.length > 1)
    .map(([normalizedName, products]) => ({
      type: "duplicate",
      normalizedName,
      products
    }));

  const uniqueNames = [...productsByName.keys()].filter((name) => name.length >= 4 && name.length <= 80);
  const signatures = new Map();
  const seenPairs = new Set();
  const similarGroups = [];

  for (const name of uniqueNames) {
    const candidates = new Set();
    for (const signature of getDeletionSignatures(name)) {
      for (const candidate of signatures.get(signature) || []) candidates.add(candidate);
    }

    for (const candidate of candidates) {
      if (!isSimilarCatalogName(name, candidate)) continue;
      const pair = [candidate, name].sort();
      const pairKey = pair.join("\u0000");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      similarGroups.push({
        type: "similar",
        normalizedName: null,
        products: [productsByName.get(pair[0])[0], productsByName.get(pair[1])[0]]
      });
    }

    for (const signature of getDeletionSignatures(name)) {
      const names = signatures.get(signature) || [];
      names.push(name);
      signatures.set(signature, names);
    }
  }

  const combined = [...groups, ...similarGroups];
  return {
    groups: combined.slice(0, maxGroups),
    totalGroups: combined.length,
    truncated: combined.length > maxGroups
  };
};
