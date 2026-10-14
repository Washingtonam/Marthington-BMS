import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearShopSession, getShopSession, shopRequest } from "../../api/shop.js";
import { useShopCart } from "../../context/ShopCartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import AdminModeToggle from "../AdminModeToggle.jsx";
import { applyAccentColor, applyColorMode, defaultAccentColor, getColorMode } from "../../utils/appearance.js";

const ShopLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useShopCart();
  const { user: bmsUser, business } = useAuth();
  const [customer, setCustomer] = useState(getShopSession().customer);

  useEffect(() => {
    applyColorMode(getColorMode());
    applyAccentColor(bmsUser?.role === "owner"
      ? business?.brandSettings?.primaryColor || defaultAccentColor
      : bmsUser?.appearance?.accentColor || defaultAccentColor);
  }, [bmsUser, business?.brandSettings?.primaryColor]);

  useEffect(() => {
    const session = getShopSession();
    if (!session.token) {
      setCustomer(null);
      return undefined;
    }
    let active = true;
    shopRequest("/customers/me")
      .then(({ customer: current }) => {
        if (!active) return;
        setCustomer(current);
        localStorage.setItem("marthington_shop_customer", JSON.stringify(current));
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          clearShopSession();
          setCustomer(null);
        }
      });
    return () => { active = false; };
  }, [location.pathname]);

  const signOut = () => {
    clearShopSession();
    setCustomer(null);
    navigate("/shop");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-4">
          <Link to="/shop" className="self-center text-lg font-black tracking-tight sm:self-auto">Marthington <span className="text-emerald-600">Storefront</span></Link>
          <nav aria-label="Storefront navigation" className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-semibold sm:w-auto sm:justify-end sm:gap-x-5 sm:text-sm">
            <NavLink to="/shop" end className="flex min-h-10 items-center text-slate-600 hover:text-emerald-700">Storefront</NavLink>
            <NavLink to="/shop/cart" className="flex min-h-10 items-center text-slate-700 hover:text-emerald-700">Cart ({count})</NavLink>
            {customer ? (
              <>
                <NavLink to="/shop/orders" className="flex min-h-10 items-center text-slate-600 hover:text-emerald-700">My orders</NavLink>
                <button type="button" onClick={signOut} className="min-h-10 text-slate-600 hover:text-rose-700">Sign out</button>
              </>
            ) : (
              <Link to="/shop/account" className="flex min-h-10 items-center rounded-lg bg-emerald-600 px-3 text-white hover:bg-emerald-700">Sign in</Link>
            )}
            {bmsUser?.role === "super_admin" && <Link to="/shop/admin" className="flex min-h-10 items-center text-emerald-700 hover:text-emerald-900">Storefront admin</Link>}
            {bmsUser?.role === "owner" && <Link to="/shop/manage" className="flex min-h-10 items-center text-emerald-700 hover:text-emerald-900">Manage storefront</Link>}
            <AdminModeToggle />
            <Link to="/" className="flex min-h-10 items-center text-slate-500 hover:text-slate-900">BMS home</Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-slate-500 sm:px-8">
          <span>Marthington Storefront — centrally managed by Marthington.</span>
          {!customer && <Link to="/shop/account" className="font-semibold text-emerald-700">Create a shopper account</Link>}
        </div>
      </footer>
    </div>
  );
};

export default ShopLayout;
