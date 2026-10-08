import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearShopSession, getShopSession, shopRequest } from "../../api/shop.js";
import { useShopCart } from "../../context/ShopCartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const ShopLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useShopCart();
  const { user: bmsUser } = useAuth();
  const [customer, setCustomer] = useState(getShopSession().customer);

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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/shop" className="text-lg font-black tracking-tight">Marthington <span className="text-emerald-600">Shop</span></Link>
          <nav className="flex items-center gap-3 text-sm font-semibold sm:gap-5">
            <NavLink to="/shop" end className="hidden text-slate-600 hover:text-emerald-700 sm:inline">Shop</NavLink>
            <NavLink to="/shop/cart" className="text-slate-700 hover:text-emerald-700">Cart ({count})</NavLink>
            {customer ? (
              <>
                <NavLink to="/shop/orders" className="hidden text-slate-600 hover:text-emerald-700 sm:inline">My orders</NavLink>
                <button type="button" onClick={signOut} className="text-slate-600 hover:text-rose-700">Sign out</button>
              </>
            ) : (
              <Link to="/shop/account" className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700">Sign in</Link>
            )}
            {bmsUser?.role === "super_admin" && <Link to="/shop/admin" className="hidden text-emerald-700 hover:text-emerald-900 sm:inline">Shop admin</Link>}
            <Link to="/" className="hidden text-slate-500 hover:text-slate-900 md:inline">BMS home</Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-slate-500 sm:px-8">
          <span>Marthington Shop — centrally managed by Marthington.</span>
          {!customer && <Link to="/shop/account" className="font-semibold text-emerald-700">Create a shopper account</Link>}
        </div>
      </footer>
    </div>
  );
};

export default ShopLayout;
