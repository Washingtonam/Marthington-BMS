import SystemSettings from "../admin/systemSettings.model.js";
import Product from "../products/product.model.js";

export const DEFAULT_PLAN_ACCESS = {
  free: {
    products: 20,
    staff: 1,
    posProducts: 500,
    features: {
      invoices: false,
      logoUpload: false,
      customReceiptThemes: false,
      businessChat: false
    }
  },
  pro: {
    products: null,
    staff: null,
    posProducts: null,
    features: {
      invoices: true,
      logoUpload: true,
      customReceiptThemes: true,
      businessChat: true
    }
  }
};

const LIMIT_KEYS = ["products", "staff", "posProducts"];
const FEATURE_KEYS = ["invoices", "logoUpload", "customReceiptThemes", "businessChat"];

export const normalizePlanAccess = (planAccess = {}) => {
  const normalized = {};

  for (const plan of ["free", "pro"]) {
    const provided = planAccess[plan] || {};
    normalized[plan] = {
      ...DEFAULT_PLAN_ACCESS[plan],
      ...provided,
      features: {
        ...DEFAULT_PLAN_ACCESS[plan].features,
        ...(provided.features || {})
      }
    };
  }

  return normalized;
};

export const validatePlanAccess = (planAccess) => {
  if (!planAccess || typeof planAccess !== "object" || Array.isArray(planAccess)) {
    return "planAccess must include free and pro settings";
  }

  for (const plan of ["free", "pro"]) {
    const settings = planAccess[plan];
    if (!settings || typeof settings !== "object") {
      return `planAccess.${plan} settings are required`;
    }

    for (const key of LIMIT_KEYS) {
      const value = settings[key];
      if (value !== null && (!Number.isInteger(value) || value < 1)) {
        return `${plan}.${key} must be a positive whole number or null for unlimited`;
      }
      if (key === "posProducts" && value !== null && value > 5000) {
        return `${plan}.posProducts cannot exceed the system maximum of 5000`;
      }
    }

    if (!settings.features || typeof settings.features !== "object") {
      return `${plan}.features settings are required`;
    }

    for (const key of FEATURE_KEYS) {
      if (typeof settings.features[key] !== "boolean") {
        return `${plan}.features.${key} must be true or false`;
      }
    }
  }

  return null;
};

export const getPlanAccess = async () => {
  const settings = await SystemSettings.findOne().select("planAccess").lean();
  return normalizePlanAccess(settings?.planAccess);
};

export const getBusinessPlanAccess = async (business) => {
  const access = await getPlanAccess();
  const plan = business?.subscription?.plan === "pro" ? "pro" : "free";
  const activePro = plan === "pro" && business.subscription?.status === "active";
  return {
    plan: activePro ? "pro" : "free",
    ...access[activePro ? "pro" : "free"]
  };
};

export const isPlanFeatureEnabled = async (business, feature) => {
  const access = await getBusinessPlanAccess(business);
  return access.features[feature] === true;
};

export const assertBusinessProductCapacity = async (business, additionalProducts) => {
  if (additionalProducts <= 0) return;
  const access = await getBusinessPlanAccess(business);
  if (access.products === null) return;

  const currentCount = await Product.countDocuments({ business: business._id });
  if (currentCount + additionalProducts > access.products) {
    const error = new Error("Product limit reached for your plan.");
    error.statusCode = 403;
    throw error;
  }
};
