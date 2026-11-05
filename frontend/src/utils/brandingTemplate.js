export const BRANDING_PLACEHOLDERS = Object.freeze({
  businessName: "{{businessName}}",
  business: "{{business}}",
  shopName: "{{shopName}}",
  phone: "{{phone}}",
  email: "{{email}}",
  address: "{{address}}",
});

export const interpolateBrandingTemplate = (template, brandingProfile = {}) => {
  if (typeof template !== "string") return template;

  const values = {
    businessName: brandingProfile.businessName ?? brandingProfile.name ?? "",
    business: brandingProfile.businessName ?? brandingProfile.name ?? "",
    shopName: brandingProfile.businessName ?? brandingProfile.name ?? "",
    phone: brandingProfile.phone ?? "",
    email: brandingProfile.email ?? "",
    address: brandingProfile.address ?? "",
  };

  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(BRANDING_PLACEHOLDERS[key]).join(String(value ?? "")),
    template
  );
};

export const replaceBrandName = (text, brandingProfile = {}, options = {}) => {
  if (typeof text !== "string") return text;

  const activeName = String(
    brandingProfile.businessName ?? brandingProfile.name ?? ""
  ).trim();
  if (!activeName) return text;

  const defaultNames = [
    ...(options.defaultNames ?? []),
    "Steve Computer Warehouse",
    "Adex Stores",
    "John Smith Store",
    "John Smith",
    "Generic Store",
    "Business Name",
  ]
    .map((name) => String(name ?? "").trim())
    .filter(Boolean);

  let result = interpolateBrandingTemplate(text, brandingProfile);
  for (const defaultName of new Set(defaultNames)) {
    if (defaultName === activeName) continue;
    if (activeName.includes(defaultName)) continue;
    result = result.split(defaultName).join(activeName);
  }
  return result;
};

export const applyBrandingToValue = (value, brandingProfile = {}, options = {}) => {
  if (typeof value === "string") {
    return replaceBrandName(value, brandingProfile, options);
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyBrandingToValue(item, brandingProfile, options));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        applyBrandingToValue(item, brandingProfile, options),
      ])
    );
  }
  return value;
};
