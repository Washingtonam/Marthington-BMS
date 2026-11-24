import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export const ONBOARDING_VERSION = "v1";

const EMPTY_PROGRESS = {
  completedTours: [],
  flowStatus: "not_started",
  flowStep: "dashboard",
  checklistDismissed: false
};

const PAGE_ROUTES = {
  dashboard: "/app",
  pos: "/app/pos",
  sales: "/app/sales",
  invoices: "/app/invoices",
  payments: "/app/payments",
  customers: "/app/customers",
  products: "/app/products",
  services: "/app/services",
  inventory: "/app/inventory",
  suppliers: "/app/suppliers",
  "supplier-performance": "/app/supplier-performance",
  "purchase-orders": "/app/purchase-orders",
  expenses: "/app/expenses",
  "budget-management": "/app/budget-management",
  "budget-alerts": "/app/budget-alerts",
  "cost-trends": "/app/cost-trends",
  billing: "/app/billing",
  reports: "/app/reports",
  analytics: "/app/analytics",
  staff: "/app/staff",
  roles: "/app/settings?tab=access",
  branches: "/app/branches",
  settings: "/app/settings",
  "user-guide": "/app/user-guide"
};

const PAGE_TOURS = {
  dashboard: {
    title: "Your business at a glance",
    steps: [
      { target: '[data-tour="dashboard-quick-stats"]', title: "Executive overview", body: "Your headline business metrics and recent performance live here." },
      { target: '[data-tour="dashboard-branch-filter"]', fallbackTarget: '[data-tour="dashboard-overview"]', title: "Branch filter", body: "Filter dashboard sales and performance metrics by location, or leave all branches selected." },
      { target: '[data-tour="dashboard-quick-stats"]', title: "Quick stats", body: "Compare today's sales, profit, expenses, and other headline indicators." },
      { target: '[data-tour="dashboard-quick-actions"]', title: "Quick workflows", body: "Jump into common tasks such as a new sale or inventory update." }
    ]
  },
  products: {
    title: "Products",
    steps: [
      { target: '[data-tour="products-add-action"]', title: "Add a product", body: "Create an item here, then set its selling price, cost price, and available stock." },
      { target: '[data-tour="products-form"]', fallbackTarget: '[data-tour="products-add-action"]', title: "Product details", body: "Enter the item name and pricing. Stock quantity makes the product available to POS." }
    ]
  },
  pos: {
    title: "Point of sale",
    steps: [
      { target: '[data-tour="pos-catalog"]', title: "Products and services", body: "Click any catalog item to add it to your cart." },
      { target: '[data-tour="pos-cart"]', fallbackTarget: '[data-tour="pos-open-cart"]', title: "Cart and customer", body: "Adjust quantities and prices, add customer WhatsApp details, or choose a branch." },
      { target: '[data-tour="pos-payment"]', fallbackTarget: '[data-tour="pos-open-cart"]', title: "Choose how they pay", body: "Record one payment or use + Split to combine Cash, Transfer, and POS." },
      { target: '[data-tour="pos-checkout"]', fallbackTarget: '[data-tour="pos-open-cart"]', title: "Complete the sale", body: "Confirm the sale to create a receipt and update stock automatically." }
    ]
  },
  sales: {
    title: "Sales history",
    steps: [
      { target: '[data-tour="sales-log"]', title: "Transaction log", body: "Review recorded sales, receipt details, and transaction statuses." },
      { target: '[data-tour="sales-filters"]', fallbackTarget: '[data-tour="sales-log"]', title: "Find a transaction", body: "Filter by date, status, or payment status to locate a sale." },
      { target: '[data-tour="sales-receipt-actions"]', fallbackTarget: '[data-tour="sales-log"]', title: "Preview and share receipts", body: "Open a receipt preview or share its transaction summary on WhatsApp." }
    ]
  },
  invoices: { title: "Invoices", steps: [{ target: "main h1", title: "Invoice workspace", body: "Create and track invoices, balances, and customer billing activity." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Create and manage", body: "Use the page actions and filters to work with invoice records." }] },
  payments: { title: "Payments", steps: [{ target: "main h1", title: "Payment verification", body: "Review incoming payment records and their verification status." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Take action", body: "Use the available filters and actions to review payment records." }] },
  customers: { title: "Customers and CRM", steps: [{ target: "main h1", title: "Customer directory", body: "Keep customer contact details and purchase history together." }, { target: "main button, main input", fallbackTarget: "main h1", title: "Find a customer", body: "Search, open a customer profile, or add a new customer from the page actions." }] },
  services: { title: "Services", steps: [{ target: "main h1", title: "Service catalog", body: "Set up services and their prices so they can be sold alongside products." }, { target: "main button, main input", fallbackTarget: "main h1", title: "Manage services", body: "Use the page actions to create or update your service catalog." }] },
  inventory: { title: "Inventory", steps: [{ target: "main h1", title: "Stock overview", body: "Monitor stock levels and inventory activity for your business." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Review stock", body: "Search or filter items to find the inventory records you need." }] },
  suppliers: { title: "Suppliers", steps: [{ target: "main h1", title: "Supplier directory", body: "Keep supplier details and purchasing contacts organized." }, { target: "main button, main input", fallbackTarget: "main h1", title: "Manage suppliers", body: "Use the page actions to add suppliers or find an existing supplier." }] },
  "supplier-performance": { title: "Supplier performance", steps: [{ target: "main h1", title: "Supplier performance", body: "Compare supplier activity and performance across your purchasing history." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Review supplier trends", body: "Use the available filters and detail links to explore supplier results." }] },
  "purchase-orders": { title: "Purchase orders", steps: [{ target: "main h1", title: "Purchase orders", body: "Create and track orders for replenishing your inventory." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Review order activity", body: "Use the available actions and filters to manage orders and receiving." }] },
  expenses: { title: "Expenses", steps: [{ target: "main h1", title: "Expense tracking", body: "Record business expenses and follow their approval status." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Review expenses", body: "Use the page actions and filters to manage expense records." }] },
  "budget-management": { title: "Budget management", steps: [{ target: "main h1", title: "Budget management", body: "Set and review spending plans for important business categories." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Manage budgets", body: "Use the page actions and filters to review or update your budgets." }] },
  "budget-alerts": { title: "Budget alerts", steps: [{ target: "main h1", title: "Budget alerts", body: "Review budget thresholds and alerts that need attention." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Investigate an alert", body: "Use the available filters and actions to follow up on budget notifications." }] },
  "cost-trends": { title: "Cost trends", steps: [{ target: "main h1", title: "Cost trends", body: "Track changes in operating costs over time." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Explore cost drivers", body: "Adjust available filters to compare trends and identify changes." }] },
  billing: { title: "Billing", steps: [{ target: "main h1", title: "Plan and billing", body: "Review your subscription, payment status, and billing options here." }, { target: "main button", fallbackTarget: "main h1", title: "Manage your plan", body: "Use the billing actions to review or update your subscription." }] },
  reports: { title: "Reports", steps: [{ target: "main h1", title: "Business reports", body: "Explore reports that summarize sales, finance, and operations." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Choose a view", body: "Use the available filters and report links to focus on the information you need." }] },
  analytics: { title: "Analytics", steps: [{ target: "main h1", title: "Analytics", body: "See trends and key indicators across your business." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Explore performance", body: "Adjust the available range or filters to inspect different periods." }] },
  staff: { title: "Staff", steps: [{ target: "main h1", title: "Staff workspace", body: "Manage team members and their access to Marthington BMS." }, { target: "main button, main input", fallbackTarget: "main h1", title: "Manage your team", body: "Use the staff actions to invite, update, and review team members." }] },
  roles: { title: "Roles and permissions", steps: [{ target: "main h1", title: "Access control", body: "Set the permissions available to each role in your business." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Review permissions", body: "Choose a role and adjust the access it needs." }] },
  branches: { title: "Branches", steps: [{ target: "main h1", title: "Business locations", body: "Set up and manage your business branches from this page." }, { target: "main button, main input", fallbackTarget: "main h1", title: "Manage locations", body: "Use the page actions to add locations or review existing branches." }] },
  settings: { title: "Settings", steps: [{ target: "main h1", title: "Business settings", body: "Configure your business profile, preferences, and integrations." }, { target: "main button, main input, main select", fallbackTarget: "main h1", title: "Choose a section", body: "Move between settings sections to update the details you need." }] },
  "user-guide": { title: "User guide", steps: [{ target: "main h1", title: "Help and workflows", body: "Find task guides, module descriptions, and answers to common questions." }, { target: "main input, main button", fallbackTarget: "main h1", title: "Find what you need", body: "Search the guide or open a workflow to see its steps." }] }
};

const normalizeProgress = (value) => ({
  ...EMPTY_PROGRESS,
  ...(value || {}),
  completedTours: Array.isArray(value?.completedTours) ? [...new Set(value.completedTours)] : []
});

const resolvePage = (pathname, search) => {
  const route = pathname.replace(/\/+$/, "") || "/app";
  if (route === "/app") return "dashboard";
  if (route === "/app/settings" && new URLSearchParams(search).get("tab") === "access") return "roles";
  return Object.entries(PAGE_ROUTES).find(([, path]) => path !== "/app" && route === path)?.[0]
    || Object.entries(PAGE_ROUTES).find(([, path]) => path !== "/app" && route.startsWith(`${path}/`))?.[0]
    || null;
};

const OnboardingContext = createContext(null);
const standaloneOnboarding = {
  progress: EMPTY_PROGRESS,
  isReady: false,
  activeTour: null,
  pageTours: PAGE_TOURS,
  pageRoutes: PAGE_ROUTES,
  startFullOnboarding: () => undefined,
  replayTour: () => undefined,
  completeFlowStep: () => undefined,
  recordProductCreated: () => undefined,
  recordPosSale: () => undefined,
  dismissChecklist: () => undefined
};

function TourOverlay({ tour, onBack, onNext, onSkip, persistenceError }) {
  const [targetRect, setTargetRect] = useState(null);
  const [position, setPosition] = useState({ top: 16, left: 16 });
  const cardRef = useRef(null);
  const step = tour?.steps[tour.stepIndex];

  useEffect(() => {
    if (!tour || !step) return undefined;
    let frame = 0;
    let active = true;
    const update = () => {
      if (!active || typeof window === "undefined") return;
      if (frame) {
        if (window.cancelAnimationFrame) window.cancelAnimationFrame(frame);
        else clearTimeout(frame);
      }
      const render = () => {
        if (!active) return;
        const primary = document.querySelector(step.target);
        const fallback = step.fallbackTarget ? document.querySelector(step.fallbackTarget) : null;
        const visible = (element) => {
          if (!element) return false;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        };
        const target = visible(primary) ? primary : visible(fallback) ? fallback : document.querySelector("main h1");
        if (!target) {
          setTargetRect(null);
          return;
        }
        if (document.activeElement !== target && !target.dataset.tourScrolled) {
          target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          target.dataset.tourScrolled = "true";
        }
        const rect = target.getBoundingClientRect();
        const padded = {
          top: Math.max(8, rect.top - 6),
          left: Math.max(8, rect.left - 6),
          width: Math.min(window.innerWidth - 16, rect.width + 12),
          height: Math.min(window.innerHeight - 16, rect.height + 12)
        };
        setTargetRect(padded);
        const card = cardRef.current;
        const cardHeight = card?.offsetHeight || 240;
        const cardWidth = Math.min(360, window.innerWidth - 32);
        const gap = 14;
        const below = rect.bottom + gap + cardHeight <= window.innerHeight - 12;
        const top = below ? rect.bottom + gap : Math.max(12, rect.top - cardHeight - gap);
        const left = Math.min(window.innerWidth - cardWidth - 12, Math.max(12, rect.left + rect.width / 2 - cardWidth / 2));
        setPosition({ top, left });
      };
      frame = window.requestAnimationFrame ? window.requestAnimationFrame(render) : window.setTimeout(render, 0);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    update();
    return () => {
      active = false;
      if (window.cancelAnimationFrame) window.cancelAnimationFrame(frame);
      else clearTimeout(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.querySelectorAll("[data-tour-scrolled]").forEach((element) => delete element.dataset.tourScrolled);
    };
  }, [tour, step]);

  if (!tour || !step) return null;
  const stepNumber = tour.stepIndex + 1;
  const stepCount = tour.steps.length;
  const finalFlowLabel = tour.mode === "initial"
    ? "Next: Add a Product"
    : tour.mode === "flow" && tour.pageKey === "products"
      ? "Next: Try POS"
      : tour.mode === "flow" && tour.pageKey === "pos"
        ? "Next: View Sales"
        : "Finish";

  return (
    <div className="bms-tour-layer" aria-live="polite">
      {targetRect ? (
        <div className="bms-tour-spotlight" style={targetRect} aria-hidden="true" />
      ) : (
        <div className="bms-tour-backdrop" aria-hidden="true" />
      )}
      <section
        ref={cardRef}
        className="bms-tour-card"
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-modal="false"
        aria-labelledby="bms-tour-title"
        aria-describedby="bms-tour-description"
      >
        <div className="bms-tour-card-top">
          <span className="bms-tour-eyebrow">{tour.title}</span>
          <button type="button" className="bms-tour-close" onClick={onSkip} aria-label="Skip tour">×</button>
        </div>
        <div className="bms-tour-progress-row">
          <span>Step {stepNumber} of {stepCount}</span>
          <span className="bms-tour-progress-track"><span style={{ width: `${(stepNumber / stepCount) * 100}%` }} /></span>
        </div>
        <h2 id="bms-tour-title">{step.title}</h2>
        <p id="bms-tour-description">{step.body}</p>
        {persistenceError && <p className="bms-tour-error" role="status">{persistenceError}</p>}
        <div className="bms-tour-actions">
          <button type="button" className="bms-tour-skip" onClick={onSkip}>Skip Tour</button>
          <div className="bms-tour-nav">
            {tour.stepIndex > 0 && <button type="button" className="bms-tour-back" onClick={onBack}>Back</button>}
            <button type="button" className="bms-tour-next" onClick={onNext}>
              {stepNumber < stepCount ? "Next" : finalFlowLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function OnboardingProvider({ children }) {
  const { user, saveOnboardingProgress } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  const [activeTour, setActiveTour] = useState(null);
  const [persistenceError, setPersistenceError] = useState("");
  const progressRef = useRef(progress);
  const userIdRef = useRef(null);
  const serverProgressRef = useRef("");
  const saveQueueRef = useRef(Promise.resolve());
  const pendingTourRef = useRef(null);
  const currentPage = resolvePage(location.pathname, location.search);

  useEffect(() => {
    const userId = user?._id || user?.id || user?.email;
    if (!userId) {
      userIdRef.current = null;
      serverProgressRef.current = "";
      setProgress(EMPTY_PROGRESS);
      progressRef.current = EMPTY_PROGRESS;
      setActiveTour(null);
      setReady(false);
      return;
    }
    const serverProgress = user.onboardingTourVersion === ONBOARDING_VERSION
      ? user.onboardingTours
      : null;
    const serverSignature = serverProgress ? JSON.stringify(serverProgress) : "";
    if (userIdRef.current === userId) {
      if (serverSignature && serverSignature !== serverProgressRef.current) {
        serverProgressRef.current = serverSignature;
        const next = normalizeProgress(serverProgress);
        progressRef.current = next;
        setProgress(next);
        try {
          localStorage.setItem(`marthington-onboarding:${userId}`, JSON.stringify({
            version: ONBOARDING_VERSION,
            ...next
          }));
        } catch (error) {
          console.error("Could not cache onboarding progress:", error);
        }
      }
      return;
    }
    userIdRef.current = userId;
    serverProgressRef.current = serverSignature;
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(`marthington-onboarding:${userId}`) || "null");
    } catch (error) {
      console.error("Could not read cached onboarding progress:", error);
    }
    const next = normalizeProgress(serverProgress || (cached?.version === ONBOARDING_VERSION ? cached : null));
    progressRef.current = next;
    setProgress(next);
    setActiveTour(null);
    setReady(true);
  }, [user]);

  const commitProgress = useCallback((patch) => {
    const next = normalizeProgress({ ...progressRef.current, ...patch });
    progressRef.current = next;
    setProgress(next);
    const userId = userIdRef.current;
    if (userId) {
      try {
        localStorage.setItem(`marthington-onboarding:${userId}`, JSON.stringify({
          version: ONBOARDING_VERSION,
          ...next
        }));
      } catch (error) {
        console.error("Could not cache onboarding progress:", error);
        setPersistenceError("Your browser could not cache tour progress.");
      }
    }
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => saveOnboardingProgress(next))
      .then(() => setPersistenceError(""))
      .catch((error) => {
        console.error("Could not save onboarding progress:", error);
        setPersistenceError("Tour progress is saved on this device but could not sync to your profile.");
      });
    return next;
  }, [saveOnboardingProgress]);

  const navigateForPage = useCallback((pageKey) => {
    navigate(PAGE_ROUTES[pageKey] || "/app");
  }, [navigate]);

  const begin = useCallback((pageKey, mode = "contextual") => {
    const config = PAGE_TOURS[pageKey];
    if (!config) return;
    setActiveTour({ pageKey, mode, title: config.title, steps: config.steps, stepIndex: 0 });
  }, []);

  const markTourComplete = useCallback((pageKey) => {
    const current = progressRef.current;
    if (current.completedTours.includes(pageKey)) return;
    commitProgress({ completedTours: [...current.completedTours, pageKey] });
  }, [commitProgress]);

  const startFlowAt = useCallback((pageKey) => {
    const next = commitProgress({
      flowStatus: "in_progress",
      flowStep: pageKey,
      completedTours: pageKey === "products"
        ? [...new Set([...progressRef.current.completedTours, "dashboard"])]
        : progressRef.current.completedTours
    });
    void next;
    setActiveTour(null);
    navigateForPage(pageKey);
    begin(pageKey, "flow");
  }, [begin, commitProgress, navigateForPage]);

  const finishFlow = useCallback(() => {
    const completedTours = [...new Set([...progressRef.current.completedTours, "sales"])];
    commitProgress({ completedTours, flowStatus: "completed", flowStep: "completed" });
    setActiveTour(null);
  }, [commitProgress]);

  const completeFlowStep = useCallback((pageKey) => {
    markTourComplete(pageKey);
    if (pageKey === "products") startFlowAt("pos");
    else if (pageKey === "pos") startFlowAt("sales");
    else if (pageKey === "sales") finishFlow();
  }, [finishFlow, markTourComplete, startFlowAt]);

  const recordProductCreated = useCallback(() => {
    commitProgress({
      completedTours: [...new Set([...progressRef.current.completedTours, "product-created"])]
    });
    if (progressRef.current.flowStatus === "in_progress" && progressRef.current.flowStep === "products") {
      completeFlowStep("products");
      return;
    }
  }, [commitProgress, completeFlowStep]);

  const recordPosSale = useCallback(() => {
    const completedTours = [...new Set([...progressRef.current.completedTours, "pos-sale"])];
    commitProgress({ completedTours });
    if (progressRef.current.flowStatus === "in_progress" && progressRef.current.flowStep === "pos") {
      completeFlowStep("pos");
    }
  }, [commitProgress, completeFlowStep]);

  const startFullOnboarding = useCallback(() => {
    commitProgress({
      completedTours: [],
      flowStatus: "in_progress",
      flowStep: "dashboard",
      checklistDismissed: false
    });
    setActiveTour(null);
    pendingTourRef.current = { pageKey: "dashboard", mode: "initial" };
    navigate("/app");
    if (currentPage === "dashboard") {
      pendingTourRef.current = null;
      begin("dashboard", "initial");
    }
  }, [begin, commitProgress, currentPage, navigate]);

  const replayTour = useCallback((pageKey) => {
    if (!PAGE_TOURS[pageKey]) return;
    pendingTourRef.current = { pageKey, mode: "contextual" };
    navigateForPage(pageKey);
    if (currentPage === pageKey) {
      pendingTourRef.current = null;
      begin(pageKey, "contextual");
    }
  }, [begin, currentPage, navigateForPage]);

  useEffect(() => {
    if (!ready || !currentPage) return;
    if (pendingTourRef.current && pendingTourRef.current.pageKey !== currentPage) return;
    if (pendingTourRef.current?.pageKey === currentPage) {
      const pending = pendingTourRef.current;
      pendingTourRef.current = null;
      begin(pending.pageKey, pending.mode);
      return;
    }
    if (activeTour?.pageKey === currentPage) return;
    if (activeTour && activeTour.pageKey !== currentPage) setActiveTour(null);

    const currentProgress = progressRef.current;
    if (currentProgress.flowStatus === "in_progress" && currentProgress.flowStep === currentPage) {
      begin(currentPage, currentPage === "dashboard" ? "initial" : "flow");
      return;
    }
    if (currentProgress.completedTours.includes(currentPage)) return;

    if (currentPage === "dashboard" && currentProgress.flowStatus === "not_started") {
      commitProgress({ flowStatus: "in_progress", flowStep: "dashboard" });
      begin("dashboard", "initial");
      return;
    }
    begin(currentPage, "contextual");
  }, [activeTour, begin, commitProgress, currentPage, location.key, ready]);

  const closeTour = useCallback((skip = false) => {
    if (!activeTour) return;
    const { pageKey, mode } = activeTour;
    if (mode === "initial") {
      markTourComplete("dashboard");
      startFlowAt("products");
      return;
    }
    if (mode === "flow" && skip) {
      markTourComplete(pageKey);
      commitProgress({ flowStatus: "skipped" });
      setActiveTour(null);
      return;
    }
    markTourComplete(pageKey);
    if (mode === "flow") completeFlowStep(pageKey);
    else setActiveTour(null);
  }, [activeTour, commitProgress, completeFlowStep, markTourComplete, startFlowAt]);

  const nextTourStep = useCallback(() => {
    if (!activeTour) return;
    if (activeTour.stepIndex < activeTour.steps.length - 1) {
      setActiveTour((current) => ({ ...current, stepIndex: current.stepIndex + 1 }));
      return;
    }
    closeTour(false);
  }, [activeTour, closeTour]);

  const backTourStep = useCallback(() => {
    setActiveTour((current) => current && current.stepIndex > 0
      ? { ...current, stepIndex: current.stepIndex - 1 }
      : current);
  }, []);

  const dismissChecklist = useCallback(() => {
    commitProgress({ checklistDismissed: true });
  }, [commitProgress]);

  const value = useMemo(() => ({
    progress,
    isReady: ready,
    activeTour,
    pageTours: PAGE_TOURS,
    pageRoutes: PAGE_ROUTES,
    startFullOnboarding,
    replayTour,
    completeFlowStep,
    recordProductCreated,
    recordPosSale,
    dismissChecklist
  }), [activeTour, completeFlowStep, dismissChecklist, progress, ready, recordPosSale, recordProductCreated, replayTour, startFullOnboarding]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <TourOverlay
        tour={activeTour}
        onBack={backTourStep}
        onNext={nextTourStep}
        onSkip={() => closeTour(true)}
        persistenceError={persistenceError}
      />
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  return context || standaloneOnboarding;
};
