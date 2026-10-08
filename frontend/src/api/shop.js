import { API_URL } from "./client.js";

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
  const token = options.token ?? getShopSession().token;
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const response = await fetch(`${API_URL}/shop${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Shop request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
};

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
