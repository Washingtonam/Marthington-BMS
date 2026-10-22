import { AFFILIATE_DEMO_MODE, API_URL } from "./client.js";
import { requestAffiliateDemo } from "./affiliateDemo.js";

const SHOP_TOKEN_KEY = "marthington_shop_token";
const SHOP_CUSTOMER_KEY = "marthington_shop_customer";

export const getShopSession = () => {
  try {
    return {
      token: localStorage.getItem(SHOP_TOKEN_KEY),
      customer: JSON.parse(localStorage.getItem(SHOP_CUSTOMER_KEY) || "null")
    };
  } catch {
    return { token: null, customer: null };
  }
};

export const saveShopSession = ({ token, customer }) => {
  localStorage.setItem(SHOP_TOKEN_KEY, token);
  localStorage.setItem(SHOP_CUSTOMER_KEY, JSON.stringify(customer));
};

export const clearShopSession = () => {
  localStorage.removeItem(SHOP_TOKEN_KEY);
  localStorage.removeItem(SHOP_CUSTOMER_KEY);
};

export const shopRequest = async (path, options = {}) => {
  if (AFFILIATE_DEMO_MODE) {
    return requestAffiliateDemo(`/shop${path}`, options);
  }
  const { token: requestToken, ...fetchOptions } = options;
  const token = requestToken ?? getShopSession().token;
  const headers = {
    ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers
  };
  const response = await fetch(`${API_URL}/shop${path}`, { ...fetchOptions, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Shop request failed.");
    error.status = response.status;
    error.code = data.code;
    error.requiresPassword = data.requiresPassword === true;
    throw error;
  }
  return data;
};

export const refreshShopCartItems = async (items) => Promise.all(items.map(async (item) => {
  try {
    const { product } = await shopRequest(`/products/${encodeURIComponent(item.id)}`);
    return { ...item, ...product, quantity: item.quantity };
  } catch (error) {
    if (error.status === 404) {
      return { ...item, available: false, canPurchase: false };
    }
    throw error;
  }
}));

export const linkMarketplaceAccount = (token, marketplacePassword) => shopRequest("/customers/link", {
  method: "POST",
  token,
  body: JSON.stringify({ marketplacePassword })
});

export const getShopCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem("marthington_shop_cart") || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
};

export const saveShopCart = (cart) => {
  localStorage.setItem("marthington_shop_cart", JSON.stringify(cart));
};

export const SHOP_TOKEN_KEY_NAME = SHOP_TOKEN_KEY;
