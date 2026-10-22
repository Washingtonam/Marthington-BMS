import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearShopSession, getShopSession, shopRequest } from "../../api/shop.js";
import { useShopCart } from "../../context/ShopCartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import AdminModeToggle from "../AdminModeToggle.jsx";
import { applyAccentColor, defaultAccentColor } from "../../utils/appearance.js";
import DemoGuideBadge from "../DemoGuideBadge.jsx";

const StorefrontAssistant = () => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([{
    from: "assistant",
    text: "Hi! I can help find products, compare prices, and answer questions about ordering. What are you looking for?"
  }]);

  const ask = async (event) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    setDraft("");
    setMessages((current) => [...current, { from: "you", text: question }]);
    const normalized = question.toLowerCase();
    const smallTalk = /\b(hello|hi|hey|good morning|good afternoon)\b/.test(normalized);
    const shoppingHelp = /\b(order|delivery|payment|checkout|cart|buy|purchase)\b/.test(normalized);
    if (smallTalk) {
      setMessages((current) => [...current, { from: "assistant", text: "Hello! Tell me a product name, category, or what you need, and I’ll look through the storefront for you." }]);
      return;
    }
    if (shoppingHelp && !/\b(price|cost|find|search|looking|item|product)\b/.test(normalized)) {
      setMessages((current) => [...current, { from: "assistant", text: "Add items to your cart, then continue to checkout. Marthington receives payment and coordinates delivery. You can also ask me to find a product or check its price." }]);
      return;
    }

    setBusy(true);
    try {
      const terms = question.replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\b(what|whats|is|the|price|cost|of|how|much|do|you|have|find|search|for|please|show|me|tell|about|details|product|products|item|items|looking|want|need|recommend|suggest|nice|good|best|anything|something|can|could|would|like|with|for|my|a|an)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const keywords = terms.split(/\s+/).filter((word) => word.length > 1);
      const queries = [...new Set([terms || question, ...keywords.slice(0, 3)])].filter(Boolean);
      let products = [];
      for (const query of queries) {
        const params = new URLSearchParams({ page: "1", limit: "8", search: query });
        const result = await shopRequest(`/?${params.toString()}`);
        products = result.products || [];
        if (products.length) break;
      }
      if (!products.length) {
        setMessages((current) => [...current, { from: "assistant", text: `I couldn’t find a close match for “${terms || question}”. Try a product name or category, or browse the categories in the menu.` }]);
        return;
      }
      setMessages((current) => [...current, {
        from: "assistant",
        text: `I found ${products.length === 1 ? "a product" : `${products.length} products`} that may help:`,
        products: products.slice(0, 5)
      }]);
    } catch (error) {
      setMessages((current) => [...current, { from: "assistant", text: error.message || "I couldn’t search the storefront just now. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <section className="mb-3 flex h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-label="Storefront assistant">
          <header className="bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-extrabold">Marthington assistant</p><p className="mt-0.5 text-[10px] text-slate-300">Product search and storefront help</p></div>
              <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white">×</button>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.from}-${index}`} className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-xs leading-5 ${message.from === "you" ? "ml-auto bg-emerald-700 text-white" : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-100"}`}>
                <p>{message.text}</p>
                {message.products?.map((product) => (
                  <Link key={product.id} to={`/shop/product/${product.id}`} onClick={() => setOpen(false)} className="mt-2 block rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 transition hover:border-emerald-300">
                    <span className="block font-bold">{product.name}</span>
                    <span className="block text-[11px] text-emerald-800">{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(product.price)}</span>
                    <span className="block text-[10px] text-slate-500">{product.available ? "In stock" : "Currently unavailable"} · View details</span>
                  </Link>
                ))}
              </div>
            ))}
            {busy && <p role="status" className="text-xs text-slate-500">Searching storefront…</p>}
          </div>
          <form onSubmit={ask} className="flex gap-2 border-t border-slate-100 bg-white p-3">
            <input aria-label="Ask the storefront assistant" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about a product..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500" />
            <button type="submit" disabled={busy || !draft.trim()} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Send</button>
          </form>
        </section>
      )}
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="ml-auto flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white shadow-xl transition hover:bg-emerald-800">
        <span aria-hidden="true">✦</span> {open ? "Close help" : "Ask us"}
      </button>
    </div>
  );
};

const ShopLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useShopCart();
  const { user: bmsUser, business } = useAuth();
  const [customer, setCustomer] = useState(getShopSession().customer);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({ whatsappNumber: "", accentColor: "#10b981", theme: "light" });
  const [expanded, setExpanded] = useState(() => localStorage.getItem("marthington_storefront_sidebar") !== "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [navigationError, setNavigationError] = useState("");
  const [navigationAttempt, setNavigationAttempt] = useState(0);

  useEffect(() => {
    const previousColor = bmsUser?.role === "owner"
      ? business?.brandSettings?.primaryColor || defaultAccentColor
      : bmsUser?.appearance?.accentColor || defaultAccentColor;
    applyAccentColor(settings.accentColor || defaultAccentColor);
    return () => applyAccentColor(previousColor);
  }, [settings.accentColor, bmsUser, business?.brandSettings?.primaryColor]);

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

  useEffect(() => {
    let active = true;
    setNavigationError("");
    Promise.all([
        shopRequest("/categories")
          .then((catalog) => { if (active) setCategories(catalog.categories || []); })
          .catch((error) => {
            if (active) setNavigationError(error.message || "Could not load storefront categories.");
          }),
        shopRequest("/settings")
          .then((storefront) => { if (active) setSettings((current) => ({ ...current, ...(storefront.settings || {}) })); })
          .catch((error) => {
            if (active) setNavigationError(error.message || "Could not load storefront appearance settings.");
          })
    ]).finally(() => { if (active) setSettingsReady(true); });
    return () => { active = false; };
  }, [navigationAttempt]);

  const themeStyle = useMemo(() => ({
    "--storefront-accent": settings.accentColor || "#10b981",
    "--storefront-background": settings.theme === "dark" ? "#0f172a" : "#f8fafc",
    "--storefront-foreground": settings.theme === "dark" ? "#f8fafc" : "#0f172a"
  }), [settings]);

  const toggleSidebar = () => {
    setExpanded((current) => {
      const next = !current;
      localStorage.setItem("marthington_storefront_sidebar", next ? "expanded" : "collapsed");
      return next;
    });
  };
  const signOut = () => {
    clearShopSession();
    setCustomer(null);
    navigate("/shop");
  };
  const closeMobileNav = () => setMobileOpen(false);
  const updateStorefrontSettings = (nextSettings) => {
    setSettings((current) => ({ ...current, ...nextSettings }));
  };

  return (
    <div data-storefront-theme={settings.theme} style={themeStyle} className="storefront-shell min-h-screen bg-[var(--storefront-background)] text-[var(--storefront-foreground)] transition-colors">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Close storefront menu" : "Open storefront menu"} aria-expanded={mobileOpen} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-xl text-slate-700 hover:bg-slate-50 lg:hidden">☰</button>
            <button type="button" onClick={toggleSidebar} aria-label={expanded ? "Collapse storefront sidebar" : "Expand storefront sidebar"} aria-expanded={expanded} className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-lg text-slate-700 hover:bg-slate-50 lg:grid">☰</button>
            <Link to="/shop" className="truncate text-lg font-black tracking-tight">
              <span className="text-emerald-700 lg:hidden">Marthington</span>
              <span className="hidden lg:inline">{expanded ? <>Marthington <span style={{ color: settings.accentColor }}>Storefront</span></> : <img src="/logo-icon.png" alt="Marthington" className="h-9 w-9 rounded-lg object-contain" />}</span>
            </Link>
          </div>
          <nav aria-label="Storefront navigation" className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs font-semibold sm:gap-x-5 sm:text-sm">
            <NavLink to="/shop/cart" className="flex min-h-10 items-center text-slate-700 hover:text-emerald-700">Cart ({count})</NavLink>
            {customer ? (
              <Link to="/shop/profile" className="flex min-h-10 items-center gap-2 rounded-xl px-2 text-slate-700 hover:bg-slate-100" aria-label="Profile and settings">
                {customer.avatar ? <img src={customer.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-xs font-black uppercase text-emerald-800">{String(customer.name || "P").slice(0, 1)}</span>}
                <span className="hidden max-w-28 truncate sm:inline">{customer.name || "Profile"}</span>
              </Link>
            ) : <Link to="/shop/account" className="flex min-h-10 items-center rounded-lg px-3 text-white" style={{ backgroundColor: settings.accentColor }}>Sign in</Link>}
            <AdminModeToggle />
            <Link to="/" className="hidden min-h-10 items-center text-slate-500 hover:text-slate-900 md:flex">BMS home</Link>
          </nav>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {mobileOpen && <button type="button" aria-label="Close storefront menu" onClick={closeMobileNav} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
            <aside className={`${mobileOpen ? "fixed inset-y-16 left-0 z-40 flex" : "hidden"} ${expanded ? "w-72" : "w-20"} shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800 transition-[width] duration-200 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)]`}>
              <div className={`flex min-h-16 items-center border-b border-slate-100 px-4 ${expanded ? "justify-between" : "justify-center"}`}>
                {expanded ? <Link to="/shop" onClick={closeMobileNav} aria-label="Marthington Storefront home" className="text-sm font-black tracking-tight">Marthington <span style={{ color: settings.accentColor }}>Storefront</span></Link> : <Link to="/shop" onClick={closeMobileNav} aria-label="Marthington Storefront home" className="grid h-10 w-10 place-items-center"><img src="/logo-icon.png" alt="Marthington" className="h-10 w-10 rounded-xl object-contain" /></Link>}
                <button type="button" onClick={toggleSidebar} aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">{expanded ? "‹" : "›"}</button>
              </div>
              <nav aria-label="Storefront categories" className="flex-1 space-y-1 overflow-y-auto p-3">
                <p className={`${expanded ? "px-3" : "sr-only"} mb-2 mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400`}>Browse</p>
                {navigationError && (
                  <div role="alert" className={`${expanded ? "mx-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700" : "sr-only"}`}>
                    <p>{navigationError}</p>
                    {expanded && <button type="button" onClick={() => { setSettingsReady(false); setNavigationAttempt((current) => current + 1); }} className="mt-2 font-bold text-rose-800 underline">Retry</button>}
                  </div>
                )}
                <NavLink to="/shop" end onClick={closeMobileNav} title="All products" className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs">⌂</span>{expanded && "All products"}
                </NavLink>
                {categories.map((category) => (
                  <NavLink key={category} to={`/shop?category=${encodeURIComponent(category)}`} onClick={closeMobileNav} title={category} className={() => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${new URLSearchParams(location.search).get("category") === category ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-black uppercase">{category.slice(0, 1)}</span>{expanded && <span className="truncate">{category}</span>}
                  </NavLink>
                ))}
                {categories.length === 0 && expanded && !navigationError && <p className="px-3 py-4 text-xs text-slate-400">{settingsReady ? "Categories will appear here as products are listed." : "Loading categories…"}</p>}
              </nav>
              <div className="space-y-1 border-t border-slate-100 p-3">
                {customer && <Link to="/shop/orders" onClick={closeMobileNav} title="My orders" className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 ${expanded ? "" : "justify-center"}`}><span>▤</span>{expanded && "My orders"}</Link>}
                {customer ? <Link to="/shop/profile" onClick={closeMobileNav} title="Profile and settings" className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 ${expanded ? "" : "justify-center"}`}><span>◉</span>{expanded && "Profile & settings"}</Link> : <Link to="/shop/account" onClick={closeMobileNav} title="Sign in or create account" className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 ${expanded ? "" : "justify-center"}`}><span>◉</span>{expanded && "Sign in / create account"}</Link>}
                {bmsUser?.role === "super_admin" && <Link to="/shop/admin" onClick={closeMobileNav} title="Storefront admin" className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 ${expanded ? "" : "justify-center"}`}><span>⚙</span>{expanded && "Storefront admin"}</Link>}
                {bmsUser?.role === "owner" && <Link to="/shop/manage" onClick={closeMobileNav} title="Manage storefront" className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 ${expanded ? "" : "justify-center"}`}><span>⚙</span>{expanded && "Manage storefront"}</Link>}
                {customer && <button type="button" onClick={() => { signOut(); closeMobileNav(); }} title="Sign out" className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 ${expanded ? "" : "justify-center"}`}><span>↪</span>{expanded && "Sign out"}</button>}
              </div>
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet context={{ settings, categories, customer, updateStorefrontSettings }} />
          <footer className="mt-12 border-t border-slate-200 bg-white text-slate-600">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs sm:px-8">
              <span>Marthington Storefront — centrally managed by Marthington.</span>
              {!customer && <Link to="/shop/account" className="font-semibold text-emerald-700">Create a shopper account</Link>}
            </div>
          </footer>
        </div>
      </div>
      <StorefrontAssistant />
      <DemoGuideBadge />
    </div>
  );
};

export default ShopLayout;
