import React, { createContext, useContext, useMemo, useState } from "react";
import { getShopCart, saveShopCart } from "../api/shop.js";

const ShopCartContext = createContext(null);

export const ShopCartProvider = ({ children }) => {
  const [items, setItems] = useState(getShopCart);

  const update = (next) => {
    setItems(next);
    saveShopCart(next);
  };

  const add = (product) => {
    if (!product.canPurchase) return;
    const existing = items.find((item) => item.id === product.id);
    update(existing
      ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...items, { ...product, quantity: 1 }]);
  };

  const setQuantity = (productId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      update(items.filter((item) => item.id !== productId));
      return;
    }
    update(items.map((item) => item.id === productId ? { ...item, quantity: Math.min(50, quantity) } : item));
  };

  const remove = (productId) => update(items.filter((item) => item.id !== productId));
  const clear = () => update([]);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);

  const value = useMemo(() => ({ items, add, setQuantity, remove, clear, count, subtotal }), [items, count, subtotal]);
  return <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>;
};

export const useShopCart = () => {
  const context = useContext(ShopCartContext);
  if (!context) throw new Error("useShopCart must be used within ShopCartProvider.");
  return context;
};
