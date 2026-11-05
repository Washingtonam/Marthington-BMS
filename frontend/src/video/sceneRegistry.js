export const SCENE_REGISTRY = Object.freeze({
  dashboard_overview: {
    key: "dashboard_overview",
    route: "/app",
    targetComponent: "Dashboard",
    demoState: { view: "overview", dateRange: "today", refreshKey: 1 },
    title: "Dashboard overview",
  },
  pos_checkout: {
    key: "pos_checkout",
    route: "/app/pos",
    targetComponent: "POS",
    demoState: { view: "checkout", cart: "sample", paymentMethod: "cash", simulateSale: true },
    title: "POS checkout",
  },
  invoice_management: {
    key: "invoice_management",
    route: "/app/invoices",
    targetComponent: "Invoices",
    demoState: { view: "list", invoiceStatus: "all", highlightDemoInvoice: true },
    title: "Invoice management",
  },
  suppliers_page: {
    key: "suppliers_page",
    route: "/app/suppliers",
    targetComponent: "Suppliers",
    demoState: { view: "directory", supplierFilter: "active", highlightDemoSupplier: true },
    title: "Suppliers page",
  },
  team_permissions: {
    key: "team_permissions",
    route: "/app/staff",
    targetComponent: "Staff",
    demoState: { view: "team", tab: "permissions", highlightPermissions: true },
    title: "Team and permissions",
  },
  customers_crm: {
    key: "customers_crm",
    route: "/app/customers",
    targetComponent: "Customers",
    demoState: { view: "crm", customerFilter: "active" },
    title: "Customer CRM",
  },
});

export const getSceneMapping = (sceneKey) =>
  SCENE_REGISTRY[sceneKey] ?? null;

export const resolveSceneMapping = (sceneKeyOrSegment) => {
  const sceneKey = typeof sceneKeyOrSegment === "string"
    ? sceneKeyOrSegment
    : sceneKeyOrSegment?.scene ?? sceneKeyOrSegment?.sceneKey ?? sceneKeyOrSegment?.key;
  return getSceneMapping(sceneKey);
};

