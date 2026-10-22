const STORAGE_KEY = "marthington_demo_workspace_v1";

export const createDemoBusiness = () => ({
  _id: "local-demo-business",
  name: "Video Demo Market",
  email: "market@example.test",
  phone: "08000000000",
  address: "Demo location, Lagos",
  industryType: "retail",
  businessType: "general_services",
  isPro: true,
  subscription: { plan: "pro", status: "active" },
  shopVisible: true,
  brandSettings: { primaryColor: "#10b981" }
});

const initialProducts = () => [
  { _id: "demo-product-rice", name: "Golden Harvest Rice", category: "Groceries", sku: "RICE-001", costPrice: 42000, sellingPrice: 55000, stock: 24, available: true, shopVisible: true, shopFeatured: true, shopSalePrice: 0, shopPriceMode: "discount", shopDescription: "A 50 kg bag of quality parboiled rice.", shopImage: "" },
  { _id: "demo-product-blender", name: "Everyday Blender", category: "Home Appliances", sku: "HOME-014", costPrice: 28000, sellingPrice: 38500, stock: 12, available: true, shopVisible: true, shopFeatured: true, shopSalePrice: 35000, shopPriceMode: "discount", shopDescription: "A practical blender for everyday kitchen use.", shopImage: "" },
  { _id: "demo-product-soap", name: "Family Care Soap Pack", category: "Personal Care", sku: "CARE-008", costPrice: 6000, sellingPrice: 8500, stock: 40, available: true, shopVisible: true, shopFeatured: false, shopSalePrice: 0, shopPriceMode: "discount", shopDescription: "A value pack for the whole family.", shopImage: "" },
  { _id: "demo-product-flour", name: "Stoneground Flour", category: "Groceries", sku: "GROC-022", costPrice: 9000, sellingPrice: 12500, stock: 18, available: true, shopVisible: true, shopFeatured: false, shopSalePrice: 0, shopPriceMode: "discount", shopDescription: "Freshly milled flour for home baking.", shopImage: "" }
];

const initialCustomer = () => ({
  _id: "demo-shop-customer",
  id: "demo-shop-customer",
  name: "Video Demo Shopper",
  email: "shopper@example.test",
  phone: "08000000001",
  addresses: [{
    _id: "demo-address-home",
    label: "Home",
    recipientName: "Video Demo Shopper",
    phone: "08000000001",
    addressLine: "10 Example Street",
    city: "Lagos",
    localGovernment: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
    countryCode: "NG"
  }]
});

const createInitialState = () => ({
  version: 1,
  business: createDemoBusiness(),
  products: initialProducts(),
  sales: [{
    _id: "demo-sale-001",
    receiptId: "DEMO-1001",
    customerName: "Sample Customer",
    totalAmount: 55000,
    paymentStatus: "paid",
    createdAt: "2026-10-19T10:30:00.000Z",
    items: [{ name: "Golden Harvest Rice", quantity: 1, sellingPrice: 55000 }]
  }],
  customers: [{ _id: "demo-customer-001", name: "Sample Customer", phone: "08000000002" }],
  shop: {
    settings: { whatsappNumber: "", accentColor: "#10b981", theme: "light" },
    customer: initialCustomer(),
    categories: ["Groceries", "Home Appliances", "Personal Care"],
    orders: []
  },
  expenses: [],
  invoices: []
});

const readState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const state = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }
  const state = JSON.parse(raw);
  if (state?.version !== 1 || !Array.isArray(state.products) || !Array.isArray(state.sales)) {
    throw new Error("Local demo workspace data is invalid. Clear this site's demo workspace data and sign in again.");
  }
  return state;
};

const writeState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const parseBody = (options) => {
  if (!options.body) return {};
  if (options.body instanceof FormData) {
    const entries = [...options.body.entries()];
    const upload = entries.find(([, value]) => typeof File !== "undefined" && value instanceof File && value.size > 0);
    if (upload) throw new Error("File uploads are unavailable in the local video-guide demo. No file was sent.");
    return Object.fromEntries(entries);
  }
  try {
    return JSON.parse(options.body);
  } catch {
    throw new Error("Invalid local demo request body.");
  }
};

const filteredProducts = (state, search = "", { storefront = false } = {}) => {
  const term = search.trim().toLowerCase();
  return state.products.filter((product) =>
    (!storefront || product.shopVisible !== false) &&
    (!term || `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(term))
  );
};

const storefrontProduct = (product, business) => {
  const originalPrice = Number(product.sellingPrice || product.price || 0);
  const salePrice = Number(product.shopSalePrice || 0);
  const price = salePrice > 0 ? salePrice : originalPrice;
  const available = Number(product.stock || 0) > 0 && product.available !== false;
  return {
    id: product._id,
    _id: product._id,
    name: product.name,
    description: product.shopDescription || "",
    category: product.category || "General",
    sku: product.sku || "",
    price,
    originalPrice,
    salePrice: salePrice > 0 ? price : 0,
    image: product.shopImage || "",
    featured: product.shopFeatured === true,
    available,
    canPurchase: available,
    business: { id: business._id, name: business.name }
  };
};

const routeError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

export function getDemoBusiness() {
  return readState().business;
}

export function updateDemoBusiness(changes) {
  const state = readState();
  state.business = { ...state.business, ...changes };
  writeState(state);
  return state.business;
}

export function linkDemoStorefrontAccount() {
  return {
    token: "local-demo-shop-session",
    customer: readState().shop.customer
  };
}

export async function requestDemoWorkspace(path, options = {}) {
  const method = options.method || "GET";
  const url = new URL(path, "http://demo.local");
  const pathname = url.pathname;
  const body = parseBody(options);
  const state = readState();

  if (pathname === "/business" && method === "GET") return state.business;
  if (pathname === "/business" && method === "PUT") return { business: updateDemoBusiness(body) };
  if (pathname === "/business/workspace" && method === "POST") return { business: state.business };
  if (pathname === "/analytics" && method === "GET") {
    const revenue = state.sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const inventoryValue = state.products.reduce((sum, product) => sum + Number(product.costPrice || 0) * Number(product.stock || 0), 0);
    return {
      metrics: {
        totalRevenue: revenue,
        grossProfit: Math.round(revenue * 0.22),
        totalOperatingExpenses: 0,
        totalProfit: Math.round(revenue * 0.22),
        totalSales: state.sales.length,
        inventoryValue,
        averageOrderValue: state.sales.length ? Math.round(revenue / state.sales.length) : 0,
        totalCustomers: state.customers.length,
        lowStockCount: state.products.filter((product) => Number(product.stock) < 10).length
      },
      salesTrend: [],
      topProducts: state.products.slice(0, 3),
      lowStockProducts: state.products.filter((product) => Number(product.stock) < 10)
    };
  }
  if (pathname === "/sales" && method === "GET") {
    return { sales: state.sales, pagination: { total: state.sales.length, totalPages: 1, currentPage: 1 } };
  }
  if (pathname === "/sales" && method === "POST") {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) throw routeError("Add a sample item before recording a demo sale.");
    const totalAmount = items.reduce((sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.quantity || 0), 0);
    const sale = {
      _id: `demo-sale-${Date.now()}`,
      receiptId: `DEMO-${Date.now().toString().slice(-6)}`,
      customerName: body.customer?.name || "Walk-in customer",
      totalAmount,
      paymentStatus: "paid",
      createdAt: new Date().toISOString(),
      items
    };
    state.sales.unshift(sale);
    writeState(state);
    return { sale, demo: true };
  }
  if (pathname === "/products" && method === "GET" || pathname === "/products/autocomplete" && method === "GET") {
    const products = filteredProducts(state, url.searchParams.get("search") || "");
    return { products, pagination: { total: products.length, totalProducts: products.length, totalPages: 1, currentPage: 1, hasNextPage: false } };
  }
  if (pathname === "/products" && method === "POST") {
    const product = { ...body, _id: `demo-product-${Date.now()}`, available: true, shopVisible: true, shopSalePrice: 0, shopPriceMode: "discount" };
    state.products.unshift(product);
    writeState(state);
    return { product, products: state.products };
  }
  const bmsProductMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (bmsProductMatch && method === "GET") {
    const product = state.products.find((item) => item._id === bmsProductMatch[1]);
    if (!product) throw routeError("Sample product not found.", 404);
    return { product };
  }
  if (bmsProductMatch && ["PUT", "PATCH"].includes(method)) {
    const product = state.products.find((item) => item._id === bmsProductMatch[1]);
    if (!product) throw routeError("Sample product not found.", 404);
    Object.assign(product, body);
    writeState(state);
    return { product };
  }
  if (bmsProductMatch && method === "DELETE") {
    state.products = state.products.filter((item) => item._id !== bmsProductMatch[1]);
    writeState(state);
    return { message: "Sample product removed from this browser only." };
  }
  if (pathname === "/categories" && method === "GET") {
    return { categories: [...new Set(state.products.map((product) => product.category).filter(Boolean))] };
  }
  if (pathname === "/services" && method === "GET") return { services: [] };
  if (pathname === "/branches" && method === "GET") return { branches: [{ _id: "demo-branch-main", name: "Main Branch", isMain: true }] };
  if (pathname === "/customers" && method === "GET") return { customers: state.customers };
  if (pathname.startsWith("/expenses") && method === "GET") return { expenses: state.expenses };
  if (pathname.startsWith("/invoices") && method === "GET") return { invoices: state.invoices, receivables: {}, payables: {} };
  if (pathname.startsWith("/notifications") && method === "GET") return { notifications: [] };
  if (pathname.startsWith("/notifications/") && ["PUT", "DELETE"].includes(method)) return { message: "No notifications in this local demo." };
  if (pathname === "/support-chat/access" && method === "GET") return { enabled: false };

  if (pathname === "/shop/categories" && method === "GET") {
    return { categories: [...new Set(state.products.filter((product) => product.shopVisible !== false).map((product) => product.category).filter(Boolean))] };
  }
  if (pathname === "/shop/settings" && method === "GET") return { settings: state.shop.settings };
  if (pathname === "/shop/settings" && ["PATCH", "PUT"].includes(method)) {
    state.shop.settings = { ...state.shop.settings, ...body };
    writeState(state);
    return { settings: state.shop.settings };
  }
  if (pathname === "/shop/" && method === "GET" || pathname === "/shop" && method === "GET") {
    const products = filteredProducts(state, url.searchParams.get("search") || "", { storefront: true })
      .filter((product) => !url.searchParams.get("category") || product.category === url.searchParams.get("category"))
      .map((product) => storefrontProduct(product, state.business));
    const limit = Number(url.searchParams.get("limit") || products.length || 24);
    const page = Number(url.searchParams.get("page") || 1);
    return { products: products.slice((page - 1) * limit, page * limit), categories: [...new Set(products.map((product) => product.category))], pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(products.length / limit)), totalProducts: products.length } };
  }
  if (pathname === "/shop/customers/link" && method === "POST") return linkDemoStorefrontAccount();
  if (pathname === "/shop/customers/login" && method === "POST" || pathname === "/shop/customers/register" && method === "POST") {
    const customer = { ...state.shop.customer, ...(body.name ? { name: body.name } : {}), ...(body.email ? { email: body.email } : {}) };
    state.shop.customer = customer;
    writeState(state);
    return { token: "local-demo-shop-session", customer };
  }
  if (pathname === "/shop/customers/me" && method === "GET") return { customer: state.shop.customer };
  if (pathname === "/shop/customers/me" && method === "PATCH") {
    state.shop.customer = { ...state.shop.customer, ...body };
    writeState(state);
    return { customer: state.shop.customer };
  }
  if (pathname.startsWith("/shop/customers/addresses/") && method === "DELETE") {
    const addressId = pathname.split("/").pop();
    state.shop.customer.addresses = state.shop.customer.addresses.filter((address) => address._id !== addressId);
    writeState(state);
    return { message: "Sample address removed locally.", customer: state.shop.customer };
  }
  const addressMatch = pathname.match(/^\/shop\/customers\/addresses\/([^/]+)$/);
  if (addressMatch && method === "PATCH") {
    const address = state.shop.customer.addresses.find((item) => item._id === addressMatch[1]);
    if (!address) throw routeError("Sample delivery address not found.", 404);
    Object.assign(address, body);
    writeState(state);
    return { customer: state.shop.customer };
  }
  if (pathname === "/shop/customers/addresses" && ["POST", "PUT"].includes(method)) {
    const address = { ...body, _id: `demo-address-${Date.now()}` };
    state.shop.customer.addresses.push(address);
    writeState(state);
    return { address, addresses: state.shop.customer.addresses, customer: state.shop.customer };
  }
  if (pathname === "/shop/orders" && method === "GET") return { orders: state.shop.orders };
  if (pathname === "/shop/orders" && method === "POST") {
    const order = { _id: `demo-order-${Date.now()}`, orderNumber: `DEMO-${Date.now().toString().slice(-6)}`, status: "received", isDemo: true, ...body, createdAt: new Date().toISOString() };
    state.shop.orders.unshift(order);
    writeState(state);
    return { order, demo: true, message: "Demo order preview saved in this browser only. No payment was started." };
  }
  const shopProductMatch = pathname.match(/^\/shop\/products\/([^/]+)$/);
  if (shopProductMatch && method === "GET") {
    const product = state.products.find((item) => item._id === shopProductMatch[1] && item.shopVisible !== false);
    if (!product) throw routeError("Sample storefront product not found.", 404);
    return {
      product: {
        ...storefrontProduct(product, state.business),
        description: product.shopDescription || "",
        relatedProducts: filteredProducts(state, "", { storefront: true }).filter((item) => item._id !== product._id).slice(0, 3).map((item) => storefrontProduct(item, state.business))
      }
    };
  }
  if (pathname === "/shop/storefront/products" && method === "GET") {
    const products = filteredProducts(state, url.searchParams.get("search") || "");
    return { business: state.business, products, pagination: { currentPage: 1, totalPages: 1, totalProducts: products.length } };
  }
  const managedProductMatch = pathname.match(/^\/shop\/storefront\/products\/([^/]+)$/);
  if (managedProductMatch && ["PATCH", "PUT"].includes(method)) {
    const product = state.products.find((item) => item._id === managedProductMatch[1]);
    if (!product) throw routeError("Sample product not found.", 404);
    Object.assign(product, body);
    writeState(state);
    return { product };
  }

  if (pathname === "/shop/orders" && method === "POST") throw routeError("Demo checkout is local only. No payment was initiated.");
  throw routeError(`This action is unavailable in the local demo (${method} ${path}). No live service was contacted.`);
}
