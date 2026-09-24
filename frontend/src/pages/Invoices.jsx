import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import request from "../api/client.js";
import { getInvoices, getInvoice, createInvoice, updateInvoicePayment, completeInvoicePickup, updateInvoiceItemProgress, getInvoicePayments, updateInvoice, deleteInvoice, shareInvoice, getInvoiceEmailHistory, bulkUpdateInvoiceStatus, bulkDeleteInvoices } from "../api/invoices.js";
import { formatCurrency } from "../utils/formatters.js";
import { getBranches } from "../api/branches.js";
import { getProducts } from "../api/products.js";
import { getServices } from "../api/services.js";
import { getCustomers, createCustomer } from "../api/customers.js";
import { getSuppliers } from "../api/suppliers.js";
import InvoicePDFTemplate from "../components/InvoicePDFTemplate.jsx";
import { downloadInvoicePDF } from "../utils/pdfGenerator.js";
import { FiAlertCircle, FiArrowDown, FiArrowUp, FiCheckCircle, FiChevronsUp, FiClock, FiDollarSign, FiDownload, FiEdit2, FiEye, FiFileText, FiMoreHorizontal, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";

const tabOptions = [
  {
    id: "outgoing",
    label: "Customer Invoices (Accounts Receivable)"
  },
  {
    id: "incoming",
    label: "Supplier Invoices (Accounts Payable)"
  }
];

const Invoices = () => {
  const navigate = useNavigate();
  const [invoiceTab, setInvoiceTab] = useState("outgoing");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalItems: 0, totalPages: 0 });
  const [serverSummary, setServerSummary] = useState({ totalBalanceDue: 0, totalAmount: 0, totalCollected: 0, pendingAmount: 0, overdueAmount: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 });
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentHistory, setPaymentHistory] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editFields, setEditFields] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    dueDate: "",
    notes: "",
    status: "",
    invoiceType: ""
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfInvoice, setPdfInvoice] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfRef = useRef(null);
  const [quickViewInvoice, setQuickViewInvoice] = useState(null);
  const [quickViewPayments, setQuickViewPayments] = useState([]);
  const [quickViewLoading, setQuickViewLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareInvoiceData, setShareInvoiceData] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const [emailHistoryOpen, setEmailHistoryOpen] = useState(false);
  const [emailHistory, setEmailHistory] = useState([]);
  const [newInvoiceModalOpen, setNewInvoiceModalOpen] = useState(false);
  const [isInvoiceDrawerMounted, setIsInvoiceDrawerMounted] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customerLookupOpen, setCustomerLookupOpen] = useState(false);
  const [customerCreationOpen, setCustomerCreationOpen] = useState(false);
  const [customerCreating, setCustomerCreating] = useState(false);
  const [newCustomerFields, setNewCustomerFields] = useState({ name: "", phone: "", email: "" });
  const [productCatalog, setProductCatalog] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownIndex, setProductDropdownIndex] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productSearchRequestRef = useRef(0);
  const [newInvoiceDraft, setNewInvoiceDraft] = useState({
    transactionType: "outgoing",
    branch: "",
    customer: "",
    supplier: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    dueDate: "",
    notes: "",
    invoiceType: "invoice",
    tax: 0,
    discount: 0,
    items: [{ product: "", name: "", quantity: 1, price: 0, total: 0 }]
  });

  const { isPro, loadingBusiness, branchId: userBranchId } = useAuth();

  useEffect(() => {
    if (newInvoiceModalOpen) {
      setIsInvoiceDrawerMounted(true);
      return undefined;
    }

    if (!isInvoiceDrawerMounted) return undefined;

    const timeoutId = setTimeout(() => setIsInvoiceDrawerMounted(false), 300);
    return () => clearTimeout(timeoutId);
  }, [newInvoiceModalOpen, isInvoiceDrawerMounted]);

  // ====================================
  // DATA LOADING
  // ====================================
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await getInvoices({
          transactionType: invoiceTab,
          status: statusFilter === "all" ? undefined : statusFilter,
          branchId: branchFilter === "all" ? undefined : branchFilter,
          search: searchTerm.trim() || undefined,
          page,
          limit: pageSize,
          sortBy,
          sortOrder
        });
        const invoiceList = (Array.isArray(data) ? data : data?.invoices || [])
          .filter(invoice => !invoice.linkedSale);
        
        // Auto-calculate overdue status based on due date
        const processedInvoices = invoiceList.map(inv => {
          if (inv.dueDate && inv.status !== "paid" && inv.status !== "cancelled") {
            const dueDate = new Date(inv.dueDate);
            const now = new Date();
            if (now > dueDate && inv.status !== "overdue") {
              return { ...inv, status: "overdue" };
            }
          }
          return inv;
        });
        
        setInvoices(processedInvoices);
        if (data?.pagination) setPagination(data.pagination);
        else setPagination({ page, limit: pageSize, totalItems: invoiceList.length, totalPages: invoiceList.length ? 1 : 0 });
        setServerSummary(data?.summary || {
          totalBalanceDue: invoiceList.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0),
          totalAmount: invoiceList.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
          totalCollected: invoiceList.reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0),
          pendingAmount: invoiceList.filter(invoice => !["Fully Paid", "Returned"].includes(invoice.paymentStatus)).reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0),
          overdueAmount: invoiceList.filter(invoice => invoice.status === "overdue").reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0),
          paidCount: invoiceList.filter(invoice => invoice.paymentStatus === "Fully Paid").length,
          pendingCount: invoiceList.filter(invoice => invoice.paymentStatus !== "Fully Paid").length,
          overdueCount: invoiceList.filter(invoice => invoice.status === "overdue").length
        });
      } catch (err) {
        console.error("Failed to load invoices:", err);
        setInvoices([]);
        setPagination({ page: 1, limit: pageSize, totalItems: 0, totalPages: 0 });
        setServerSummary({ totalBalanceDue: 0, totalAmount: 0, totalCollected: 0, pendingAmount: 0, overdueAmount: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [invoiceTab, statusFilter, searchTerm, branchFilter, page, pageSize, sortBy, sortOrder, invoiceRefreshKey]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await getBranches();
        setBranches(Array.isArray(data) ? data : data?.branches || []);
      } catch (err) {
        console.error("Failed to load branches:", err);
        setBranches([]);
      }
    };

    loadBranches();
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedInvoiceIds(new Set());
  }, [invoiceTab, statusFilter, searchTerm, branchFilter, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    setSelectedInvoiceIds(new Set());
  }, [page]);

  // ====================================
  // COMPUTED METRICS
  // ====================================
  const metrics = useMemo(() => {
    const receivables = invoices.filter(inv => inv.transactionType === "outgoing");
    const payables = invoices.filter(inv => inv.transactionType === "incoming");

    const totalReceivable = receivables.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const totalPayable = payables.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const overdueDebt = invoices
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const overdueReceivables = receivables
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const overduePayables = payables
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

    return {
      totalReceivable,
      totalPayable,
      overdueDebt,
      overdueReceivables,
      overduePayables
    };
  }, [invoices]);

  const activeBalance = serverSummary.totalBalanceDue;
  const activeOverdueBalance = serverSummary.overdueAmount || (invoiceTab === "incoming" ? metrics.overduePayables : metrics.overdueReceivables);
  const activeInvoiceCount = pagination.totalItems;

  const displayedInvoices = invoices;
  const displayedInvoiceIds = displayedInvoices.map(invoice => invoice._id);
  const allDisplayedSelected = displayedInvoiceIds.length > 0 && displayedInvoiceIds.every(id => selectedInvoiceIds.has(id));

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoiceIds(previous => {
      const next = new Set(previous);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  const toggleAllDisplayedInvoices = () => {
    setSelectedInvoiceIds(previous => {
      const next = new Set(previous);
      if (allDisplayedSelected) displayedInvoiceIds.forEach(id => next.delete(id));
      else displayedInvoiceIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    const invoiceIds = [...selectedInvoiceIds];
    if (!invoiceIds.length) return;
    const actionLabel = status === "cancelled" ? "cancel" : "mark as sent";
    if (!confirm(`Are you sure you want to ${actionLabel} ${invoiceIds.length} invoice${invoiceIds.length === 1 ? "" : "s"}?`)) return;

    try {
      setBulkUpdating(true);
      const result = await bulkUpdateInvoiceStatus(invoiceIds, status);
      setSelectedInvoiceIds(new Set());
      setInvoiceRefreshKey(value => value + 1);
      alert(`${result.updatedCount} invoice${result.updatedCount === 1 ? "" : "s"} updated${result.skippedCount ? `; ${result.skippedCount} skipped because they were not eligible.` : "."}`);
    } catch (err) {
      console.error("Failed to update invoices in bulk:", err);
      alert(err.message || "Unable to update the selected invoices.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    const invoiceIds = [...selectedInvoiceIds];
    if (!invoiceIds.length) return;
    if (!confirm(`Delete ${invoiceIds.length} selected invoice${invoiceIds.length === 1 ? "" : "s"}? This cannot be undone.`)) return;

    try {
      setBulkUpdating(true);
      const result = await bulkDeleteInvoices(invoiceIds);
      setSelectedInvoiceIds(new Set());
      setInvoiceRefreshKey(value => value + 1);
      alert(`${result.deletedCount} invoice${result.deletedCount === 1 ? "" : "s"} deleted${result.skippedCount ? `; ${result.skippedCount} skipped because they could not be deleted.` : "."}`);
    } catch (err) {
      console.error("Failed to delete invoices in bulk:", err);
      alert(err.message || "Unable to delete the selected invoices.");
    } finally {
      setBulkUpdating(false);
    }
  };

  // ====================================
  // ACTIONS
  // ====================================
  const handleNavigateToCustomer = (invoice) => {
    if (invoice.customer?._id) {
      navigate(`/app/customers/${invoice.customer._id}`);
    } else if (invoice.customer) {
      navigate(`/app/customers/${invoice.customer}`);
    }
  };

  const handleNavigateToSupplier = (invoice) => {
    if (invoice.supplier?._id) {
      navigate(`/app/suppliers/${invoice.supplier._id}`);
    } else if (invoice.supplier) {
      navigate(`/app/suppliers/${invoice.supplier}`);
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    if (!confirm("Mark this invoice as paid?")) return;
    try {
      const invoice = invoices.find(inv => inv._id === invoiceId);
      if (!invoice) return;

      // Record a payment for the full outstanding balance to mark as paid
      // This ensures amountPaid is updated, so paymentStatus is correctly recalculated
      const updatedInvoice = await updateInvoicePayment(
        invoiceId,
        invoice.balanceDue || invoice.totalAmount,
        "other",
        "Mark as Paid",
        "Marked as paid by admin"
      );

      // Update local state with fresh data from backend
      setInvoices(invoices.map(inv =>
        inv._id === invoiceId ? updatedInvoice : inv
      ));
      alert("Invoice marked as paid successfully.");
    } catch (err) {
      console.error("Failed to mark invoice as paid:", err);
      alert("Failed to mark invoice as paid. Please try again.");
    }
  };

  const openNewInvoiceModal = async () => {
    if (!isPro && !loadingBusiness) {
      navigate("/app/billing");
      return;
    }

    setNewInvoiceDraft({
      transactionType: "outgoing",
      branch: userBranchId || "",
      customer: "",
      supplier: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      dueDate: "",
      notes: "",
      invoiceType: "invoice",
      tax: 0,
      discount: 0,
      items: [{ product: "", name: "", quantity: 1, price: 0, total: 0 }]
    });
    setCustomerLookupOpen(false);
    try {
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : data?.customers || []);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setCustomers([]);
    }
    try {
      const data = await getSuppliers();
      setSuppliers(Array.isArray(data) ? data : data?.suppliers || []);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      setSuppliers([]);
    }
    setProductSearch("");
    setProductDropdownIndex(null);
    setNewInvoiceModalOpen(true);
  };

  const closeInvoiceDrawer = () => {
    setCustomerLookupOpen(false);
    setProductDropdownIndex(null);
    setNewInvoiceModalOpen(false);
  };

  const customerMatches = useMemo(() => {
    const query = newInvoiceDraft.customerName.trim().toLowerCase();
    const phoneQuery = newInvoiceDraft.customerPhone.trim().toLowerCase();
    if (!query && !phoneQuery) return customers.slice(0, 8);

    return customers.filter(customer => {
      const name = String(customer.name || "").toLowerCase();
      const phone = String(customer.phone || "").toLowerCase();
      return (query && name.includes(query)) || (phoneQuery && phone.includes(phoneQuery));
    }).slice(0, 8);
  }, [customers, newInvoiceDraft.customerName, newInvoiceDraft.customerPhone]);

  const handleCustomerLookupChange = (field, value) => {
    setNewInvoiceDraft(prev => ({
      ...prev,
      [field]: value,
      customer: ""
    }));
    setCustomerLookupOpen(true);
  };

  const handleSelectCustomer = (customer) => {
    setNewInvoiceDraft(prev => ({
      ...prev,
      customer: customer._id,
      customerName: customer.name || "",
      customerPhone: customer.phone || "",
      customerEmail: customer.email || ""
    }));
    setCustomerLookupOpen(false);
  };

  const handleOpenCustomerCreation = () => {
    setNewCustomerFields({
      name: newInvoiceDraft.customerName.trim(),
      phone: newInvoiceDraft.customerPhone.trim(),
      email: newInvoiceDraft.customerEmail.trim()
    });
    setCustomerLookupOpen(false);
    setCustomerCreationOpen(true);
  };

  const handleCreateCustomer = async () => {
    const name = newCustomerFields.name.trim();
    if (!name) {
      alert("Enter a customer name.");
      return;
    }

    try {
      setCustomerCreating(true);
      const customer = await createCustomer({
        name,
        phone: newCustomerFields.phone.trim(),
        email: newCustomerFields.email.trim()
      });
      setCustomers(prev => [customer, ...prev]);
      handleSelectCustomer(customer);
      setCustomerCreationOpen(false);
    } catch (err) {
      console.error("Failed to create customer:", err);
      alert(err.message || "Failed to create customer.");
    } finally {
      setCustomerCreating(false);
    }
  };

  useEffect(() => {
    const search = productSearch.trim();
    if (!newInvoiceModalOpen || productDropdownIndex === null || !search) {
      setProductCatalog([]);
      setLoadingProducts(false);
      return undefined;
    }

    const requestId = ++productSearchRequestRef.current;
    let cancelled = false;

    const loadCatalogMatches = async () => {
      setLoadingProducts(true);
      try {
        const [productResult, serviceResult] = await Promise.allSettled([
          getProducts({ search, limit: 50 }),
          getServices({ search })
        ]);
        if (cancelled || requestId !== productSearchRequestRef.current) return;

        const products = productResult.status === "fulfilled" ? productResult.value : [];
        const services = serviceResult.status === "fulfilled" ? serviceResult.value : [];
        const productList = Array.isArray(products) ? products : products?.products || [];
        const serviceList = Array.isArray(services) ? services : services?.data || services?.services || [];
        setProductCatalog([
          ...productList.map(product => ({ ...product, catalogType: "product" })),
          ...serviceList.map(service => ({
            ...service,
            catalogType: "service",
            price: Number(service.price || service.sellingPrice || 0),
            stock: null
          }))
        ]);
      } catch (err) {
        if (!cancelled && requestId === productSearchRequestRef.current) {
          console.error("Failed to search products and services:", err);
          setProductCatalog([]);
        }
      } finally {
        if (!cancelled && requestId === productSearchRequestRef.current) {
          setLoadingProducts(false);
        }
      }
    };

    loadCatalogMatches();
    return () => {
      cancelled = true;
    };
  }, [newInvoiceModalOpen, productDropdownIndex, productSearch]);

  const updateNewInvoiceItem = (index, field, value) => {
    setNewInvoiceDraft(prev => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };

      if (field === "product") {
        const selectedCatalogItem = productCatalog.find(product => product._id === value);
        if (selectedCatalogItem) {
          nextItems[index].product = selectedCatalogItem.catalogType === "product" ? selectedCatalogItem._id : "";
          nextItems[index].service = selectedCatalogItem.catalogType === "service" ? selectedCatalogItem._id : "";
          nextItems[index].name = selectedCatalogItem.name || "";
          nextItems[index].price = Number(selectedCatalogItem.price || selectedCatalogItem.sellingPrice || 0);
        }
      }

      if (field === "quantity" || field === "price") {
        const quantity = Number(nextItems[index].quantity || 0);
        const price = Number(nextItems[index].price || 0);
        nextItems[index].total = quantity * price;
      }

      return { ...prev, items: nextItems };
    });
  };

  const addNewInvoiceItem = () => {
    setNewInvoiceDraft(prev => ({
      ...prev,
      items: [...prev.items, { product: "", name: "", quantity: 1, price: 0, total: 0 }]
    }));
  };

  const removeNewInvoiceItem = (index) => {
    setNewInvoiceDraft(prev => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const calculateInvoiceDraftTotals = () => {
    const subtotal = (newInvoiceDraft.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
    const tax = Number(newInvoiceDraft.tax || 0);
    const discount = Number(newInvoiceDraft.discount || 0);
    const totalAmount = subtotal + tax - discount;

    return { subtotal, tax, discount, totalAmount };
  };

  const handleCreateInvoice = async () => {
    const { items = [], customer, supplier, customerName, customerPhone, customerEmail, dueDate, notes, invoiceType, tax, discount, transactionType, branch } = newInvoiceDraft;

    const validItems = items.filter(item => item && (item.product || item.service || item.name));
    if (!validItems.length) {
      alert("Add at least one product or service to the invoice.");
      return;
    }

    const itemPayload = validItems.map(item => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);

      if (!item.product && !item.service) {
        throw new Error("Each invoice item must include a product or service.");
      }

      return {
        product: item.product,
        service: item.service,
        name: item.name || "Product",
        quantity,
        price,
        total: quantity * price
      };
    });

    if (transactionType === "incoming" && !supplier) {
      alert("Select a supplier for an incoming invoice.");
      return;
    }

    try {
      setCreatingInvoice(true);
      const invoice = await createInvoice({
        transactionType,
        branch: branch || null,
        customer: customer || null,
        supplier: supplier || null,
        customerName,
        customerPhone,
        customerEmail,
        dueDate: dueDate || null,
        notes,
        invoiceType,
        items: itemPayload,
        tax: Number(tax || 0),
        discount: Number(discount || 0)
      });

      setInvoices([invoice, ...invoices]);
      setNewInvoiceModalOpen(false);
      setNewInvoiceDraft({
        transactionType: "outgoing",
        branch: userBranchId || "",
        customer: "",
        supplier: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        dueDate: "",
        notes: "",
        invoiceType: "invoice",
        tax: 0,
        discount: 0,
        items: [{ product: "", name: "", quantity: 1, price: 0, total: 0 }]
      });
      setProductSearch("");
      setProductDropdownIndex(null);
      alert("Invoice created successfully.");
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert(err.message || "Failed to create invoice. Please try again.");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleViewPDF = (invoice) => {
    // Open PDF preview modal
    handleOpenPdfModal(invoice);
  };

  const handleShareLink = (invoice) => {
    // Open share modal instead of just copying link
    handleOpenShareModal(invoice);
  };

  const handleOpenPaymentModal = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(String(invoice.balanceDue || invoice.totalAmount || 0));
    setPaymentModalOpen(true);
    getInvoicePayments(invoice._id)
      .then(data => {
        const records = Array.isArray(data) ? data : data?.payments || [];
        setPaymentHistory(prev => ({
          ...prev,
          [invoice._id]: records.map(record => ({
            date: record.createdAt,
            amount: record.amount,
            method: record.paymentMethod,
            reference: record.referenceNumber
          }))
        }));
      })
      .catch(err => console.error("Failed to load payment history:", err));
  };

  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentInvoice(null);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setPaymentNotes("");
  };

  const handleSubmitPayment = async () => {
    if (!paymentInvoice) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    if (amount > (paymentInvoice.balanceDue || paymentInvoice.totalAmount || 0)) {
      alert("Payment cannot exceed the invoice balance due.");
      return;
    }

    try {
      const updatedInvoice = await updateInvoicePayment(
        paymentInvoice._id,
        amount,
        paymentMethod,
        paymentReference,
        paymentNotes
      );
      
      // Update invoices list with fresh data
      setInvoices(invoices.map(inv =>
        inv._id === updatedInvoice._id ? updatedInvoice : inv
      ));
      
      setPaymentHistory(prev => ({
        ...prev,
        [updatedInvoice._id]: [
          ...(prev[updatedInvoice._id] || []),
          {
            date: new Date().toISOString(),
            amount,
            method: paymentMethod,
            reference: paymentReference
          }
        ]
      }));
      
      // Close PDF modal if open to force fresh data on next view
      if (pdfModalOpen) {
        setPdfModalOpen(false);
        setPdfInvoice(null);
      }
      
      alert("Payment recorded successfully. Stock will be updated when the customer collects the invoice.");
      handleClosePaymentModal();
    } catch (err) {
      console.error("Failed to log payment:", err);
      alert("Unable to record payment. Please try again.");
    }
  };

  const handleCompletePickup = async (invoice) => {
    if (!confirm(`Complete pickup for invoice ${invoice.invoiceNumber || ""}? This will record the sale and deduct stock.`)) return;

    try {
      const result = await completeInvoicePickup(invoice._id);
      const updatedInvoice = result.invoice || result;
      setInvoices(prev => prev.map(item => item._id === updatedInvoice._id ? updatedInvoice : item));
      alert("Pickup completed and sale recorded successfully.");
    } catch (err) {
      console.error("Failed to complete invoice pickup:", err);
      alert(err.message || "Unable to complete pickup.");
    }
  };

  const handleServiceProgress = async (invoice, itemIndex, serviceStatus) => {
    try {
      const updatedInvoice = await updateInvoiceItemProgress(invoice._id, itemIndex, serviceStatus);
      setInvoices(prev => prev.map(item => item._id === updatedInvoice._id ? updatedInvoice : item));
    } catch (err) {
      console.error("Failed to update service progress:", err);
      alert(err.message || "Unable to update service progress.");
    }
  };

  // ====================================
  // PDF HANDLING
  // ====================================
  const handleOpenPdfModal = async (invoice) => {
    setPdfInvoice(null);
    setPdfModalOpen(true);
    setPdfLoading(true);

    try {
      // Add timestamp to force fresh data fetch (bypass any caching)
      const pdfData = await request(`/invoices/${invoice._id}/pdf?t=${Date.now()}`);
      const invoiceData = pdfData.invoice || pdfData;
      setPdfInvoice(invoiceData);
    } catch (err) {
      console.error("Failed to load invoice for PDF:", err);
      alert("Unable to load invoice for PDF generation.");
      setPdfModalOpen(false);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async (format = 'pdf') => {
    if (!pdfInvoice) {
      alert("Invoice data is still loading. Please try again in a moment.");
      return;
    }

    if (!pdfRef.current) {
      alert("The invoice preview is still rendering. Please try again in a moment.");
      return;
    }

    try {
      setPdfLoading(true);
      const fileName = format === 'jpg' 
        ? `invoice-${pdfInvoice.invoiceNumber}.jpg`
        : `invoice-${pdfInvoice.invoiceNumber}.pdf`;
      
      await downloadInvoicePDF(
        pdfInvoice,
        pdfRef.current,
        fileName,
        format
      );
      alert(`${format.toUpperCase()} downloaded successfully!`);
    } catch (err) {
      console.error("Download failed:", err);
      alert(`Failed to download ${format.toUpperCase()}. Please try again.`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdfModal = () => {
    setPdfModalOpen(false);
    setPdfInvoice(null);
  };

  const handleOpenQuickView = async (invoice) => {
    setQuickViewInvoice(invoice);
    setQuickViewPayments([]);
    setQuickViewLoading(true);

    try {
      const [invoiceData, paymentsData] = await Promise.all([
        getInvoice(invoice._id),
        getInvoicePayments(invoice._id)
      ]);
      setQuickViewInvoice(invoiceData.invoice || invoiceData);
      setQuickViewPayments(paymentsData.payments || paymentsData || []);
    } catch (err) {
      console.error("Failed to load invoice details:", err);
    } finally {
      setQuickViewLoading(false);
    }
  };

  const handleCloseQuickView = () => {
    setQuickViewInvoice(null);
    setQuickViewPayments([]);
  };

  const handleSort = (nextSortBy) => {
    if (sortBy === nextSortBy) {
      setSortOrder(previous => previous === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(nextSortBy);
    setSortOrder(nextSortBy === "dueDate" ? "asc" : "desc");
  };

  const handleExportCsv = () => {
    const headers = ["Invoice ID", "Counterparty", "Issue Date", "Due Date", "Amount", "Balance Due", "Payment Status", "Invoice Status"];
    const rows = displayedInvoices.map(invoice => [
      invoice.invoiceNumber || invoice._id,
      invoice.customerName || invoice.customer?.name || invoice.supplier?.name || "",
      invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "",
      invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "",
      invoice.totalAmount || 0,
      invoice.balanceDue || 0,
      invoice.paymentStatus || "Unpaid",
      invoice.status || "draft"
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices-${invoiceTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, field, align = "left" }) => {
    const active = sortBy === field;
    const SortIcon = active ? (sortOrder === "asc" ? FiArrowUp : FiArrowDown) : FiChevronsUp;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`group inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-slate-950 ${align === "right" ? "text-right" : "text-left"} ${active ? "text-slate-950" : "text-slate-500"}`}
      >
        {label}
        <SortIcon className={`h-3.5 w-3.5 ${active ? "text-blue-600" : "text-slate-300 group-hover:text-slate-500"}`} aria-hidden="true" />
      </button>
    );
  };

  // ====================================
  // SHARE HANDLING
  // ====================================
  const handleOpenShareModal = (invoice) => {
    setShareInvoiceData(invoice);
    setShareEmail("");
    setShareMessage("");
    setShareModalOpen(true);
    loadEmailHistory(invoice._id);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setShareInvoiceData(null);
    setShareEmail("");
    setShareMessage("");
    setEmailHistory([]);
  };

  const loadEmailHistory = async (invoiceId) => {
    try {
      const data = await getInvoiceEmailHistory(invoiceId);
      setEmailHistory(data.emailHistory || []);
    } catch (err) {
      console.error("Failed to load email history:", err);
    }
  };

  const handleSubmitShare = async () => {
    if (!shareEmail || !shareEmail.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setSharing(true);
    try {
      const result = await shareInvoice(shareInvoiceData._id, shareEmail, shareMessage);
      alert(result.message || "Invoice shared successfully!");
      
      // Reload email history
      await loadEmailHistory(shareInvoiceData._id);
      setShareEmail("");
      setShareMessage("");
    } catch (err) {
      console.error("Failed to share invoice:", err);
      alert("Failed to share invoice. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleOpenEditModal = (invoice) => {
    setEditInvoice(invoice);
    setEditFields({
      customerName: invoice.customerName || "",
      customerPhone: invoice.customerPhone || "",
      customerEmail: invoice.customerEmail || "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "",
      notes: invoice.notes || "",
      status: invoice.status || "",
      invoiceType: invoice.invoiceType || ""
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditInvoice(null);
    setEditFields({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      dueDate: "",
      notes: "",
      status: "",
      invoiceType: ""
    });
  };

  const handleEditFieldChange = (field, value) => {
    setEditFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitEdit = async () => {
    if (!editInvoice) return;

    try {
      const updatedInvoice = await updateInvoice(editInvoice._id, {
        customerName: editFields.customerName,
        customerPhone: editFields.customerPhone,
        customerEmail: editFields.customerEmail,
        dueDate: editFields.dueDate || null,
        notes: editFields.notes,
        status: editFields.status,
        invoiceType: editFields.invoiceType
      });
      setInvoices(invoices.map(inv =>
        inv._id === updatedInvoice._id ? updatedInvoice : inv
      ));
      handleCloseEditModal();
    } catch (err) {
      console.error("Failed to update invoice:", err);
      alert("Unable to save invoice changes. Please try again.");
    }
  };

  const handleOpenDeleteModal = (invoiceId) => {
    setDeleteInvoiceId(invoiceId);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteInvoiceId(null);
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;

    try {
      await deleteInvoice(deleteInvoiceId);
      setInvoices(invoices.filter(inv => inv._id !== deleteInvoiceId));
      handleCloseDeleteModal();
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      alert("Unable to delete invoice. Please try again.");
    }
  };

  const paymentRecords = paymentInvoice ? (paymentHistory[paymentInvoice._id] || []) : [];

  // ====================================
  // EMPTY STATE
  // ====================================
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center">
            <span className="text-5xl">📄</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900">{searchTerm || statusFilter !== "all" || branchFilter !== "all" ? "No matching invoices" : "No Invoices Yet"}</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {searchTerm || statusFilter !== "all" || branchFilter !== "all"
            ? "Try clearing a filter or changing your search to find another invoice."
            : "Start creating invoices to track your billing and manage customer payments efficiently."}
        </p>
        {!searchTerm && statusFilter === "all" && branchFilter === "all" && (
          <button
            onClick={openNewInvoiceModal}
            disabled={creatingInvoice || loadingBusiness}
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {creatingInvoice ? "Creating..." : "+ Create Invoice"}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50/80 py-8 px-4 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <FiFileText className="h-4 w-4 text-blue-600" /> Billing operations
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-100">Invoice management</h1>
            <p className="mt-1 text-sm text-slate-500">Monitor collections, outstanding balances, and customer billing activity.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleExportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <FiDownload className="h-4 w-4" /> Export
            </button>
            <button
              onClick={openNewInvoiceModal}
              disabled={creatingInvoice || loadingBusiness}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <FiPlus className="h-4 w-4" /> {creatingInvoice ? "Creating..." : "Create invoice"}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-1 sm:flex-row">
            {tabOptions.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInvoiceTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
                  invoiceTab === tab.id
                    ? "border-blue-600 text-blue-700 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total invoiced", value: serverSummary.totalAmount, detail: `${activeInvoiceCount} invoices in scope`, icon: FiFileText, tone: "text-slate-700", iconTone: "bg-slate-100 text-slate-600" },
            { label: "Paid / collected", value: serverSummary.totalCollected, detail: `${serverSummary.paidCount || 0} fully paid`, icon: FiCheckCircle, tone: "text-emerald-700", iconTone: "bg-emerald-50 text-emerald-600" },
            { label: "Pending / outstanding", value: serverSummary.pendingAmount || activeBalance, detail: `${serverSummary.pendingCount || 0} awaiting payment`, icon: FiClock, tone: "text-amber-700", iconTone: "bg-amber-50 text-amber-600" },
            { label: "Overdue", value: activeOverdueBalance, detail: `${serverSummary.overdueCount || 0} past due`, icon: FiAlertCircle, tone: "text-rose-700", iconTone: "bg-rose-50 text-rose-600" }
          ].map(({ label, value, detail, icon: Icon, tone, iconTone }) => (
            <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className={`mt-3 text-2xl font-extrabold tracking-tight ${tone}`}>{formatCurrency(value || 0)}</p>
                  <p className="mt-2 text-xs text-slate-500">{detail}</p>
                </div>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconTone}`}><Icon className="h-4 w-4" /></span>
              </div>
            </div>
          ))}
        </div>

        {/* FILTER & SEARCH */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice, client, or email"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={e => {
                const [nextSortBy, nextSortOrder] = e.target.value.split(":");
                setSortBy(nextSortBy);
                setSortOrder(nextSortOrder);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="totalAmount:desc">Highest amount</option>
              <option value="totalAmount:asc">Lowest amount</option>
              <option value="balanceDue:desc">Highest balance due</option>
              <option value="balanceDue:asc">Lowest balance due</option>
              <option value="dueDate:asc">Due date soonest</option>
              <option value="dueDate:desc">Due date latest</option>
            </select>
          </div>
        </div>

        {selectedInvoiceIds.size > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-blue-900">
              {selectedInvoiceIds.size} invoice{selectedInvoiceIds.size === 1 ? "" : "s"} selected on this page
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatusUpdate("sent")}
                disabled={bulkUpdating}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200 disabled:opacity-50"
              >
                {bulkUpdating ? "Updating..." : "Mark as sent"}
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusUpdate("cancelled")}
                disabled={bulkUpdating}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm ring-1 ring-red-200 disabled:opacity-50"
              >
                Cancel selected
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkUpdating}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm ring-1 ring-red-200 disabled:opacity-50"
              >
                Delete selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoiceIds(new Set())}
                disabled={bulkUpdating}
                className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* INVOICE TABLE */}
        {displayedInvoices.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-slate-200">
                  <tr>
                    <th className="w-12 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={allDisplayedSelected}
                        onChange={toggleAllDisplayedInvoices}
                        aria-label="Select all invoices on this page"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-5 py-3 text-left"><SortHeader label="Invoice ID" field="invoiceNumber" /></th>
                    <th className="px-5 py-3 text-left"><SortHeader label="Counterparty" field="customerName" /></th>
                    <th className="px-5 py-3 text-left"><SortHeader label="Issue date" field="createdAt" /></th>
                    <th className="px-5 py-3 text-left"><SortHeader label="Due date" field="dueDate" /></th>
                    <th className="px-5 py-3 text-right"><SortHeader label="Amount" field="totalAmount" align="right" /></th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-500">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-500">Progress</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedInvoices.map(invoice => {
                    const counterparty = invoiceTab === "incoming"
                      ? (invoice.supplier?.name || invoice.customerName || "Supplier")
                      : (invoice.customerName || invoice.supplier?.name || "Customer");
                    const productItems = (invoice.items || []).filter(item => item.product);
                    const serviceItems = (invoice.items || []).filter(item => item.service);
                    const collectedProducts = productItems.filter(item => item.fulfillmentStatus === "collected" || item.soldQuantity >= item.quantity).length;
                    const completedServices = serviceItems.filter(item => item.serviceStatus === "completed").length;
                    const hasCollectibleProducts = invoice.transactionType === "outgoing" && productItems.length > 0 && collectedProducts < productItems.length;

                    return (
                      <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedInvoiceIds.has(invoice._id)}
                            onChange={() => toggleInvoiceSelection(invoice._id)}
                            aria-label={`Select invoice ${invoice.invoiceNumber || invoice._id?.slice(-6)}`}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900">#{invoice.invoiceNumber || invoice._id?.slice(-6)}</p>
                            <p className="text-xs text-slate-500 mt-1 capitalize">{invoice.invoiceType || "invoice"}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div
                            className="cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => invoiceTab === "incoming" ? handleNavigateToSupplier(invoice) : handleNavigateToCustomer(invoice)}
                            onKeyDown={event => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                invoiceTab === "incoming" ? handleNavigateToSupplier(invoice) : handleNavigateToCustomer(invoice);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <p className="font-semibold text-gray-900 hover:underline">{counterparty}</p>
                            <p className="text-xs text-slate-500 mt-1">{invoice.customerEmail || invoice.supplier?.email || (invoice.transactionType === "incoming" ? "Supplier invoice" : "Customer invoice")}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          <span className={invoice.status === "overdue" ? "font-semibold text-rose-600" : "text-slate-600"}>
                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <p className="font-bold text-slate-900">{formatCurrency(invoice.totalAmount || 0)}</p>
                          <p className="mt-1 text-xs text-slate-500">Due {formatCurrency(invoice.balanceDue || 0)}</p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                              invoice.paymentStatus === "Fully Paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : invoice.paymentStatus === "Returned"
                                ? "bg-slate-100 text-slate-700"
                                : invoice.status === "overdue"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {invoice.paymentStatus || "Unpaid"}
                            </span>
                            <p className="text-xs capitalize text-slate-500">{invoice.status || "draft"}</p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {productItems.length > 0 && (
                            <p className="mt-1 text-xs font-semibold text-indigo-600">Products: {collectedProducts}/{productItems.length} collected</p>
                          )}
                          {serviceItems.length > 0 && (
                            <p className="mt-1 text-xs font-semibold text-violet-600">Services: {completedServices}/{serviceItems.length} completed</p>
                          )}
                          {serviceItems.map(item => {
                            const itemIndex = invoice.items.indexOf(item);
                            const nextStatus = item.serviceStatus === "pending" ? "in_progress" : "completed";
                            const actionLabel = item.serviceStatus === "pending" ? "Start service" : item.serviceStatus === "in_progress" ? "Complete service" : "Service completed";
                            return (
                              <button
                                key={`${invoice._id}-${itemIndex}`}
                                type="button"
                                onClick={() => item.serviceStatus !== "completed" && handleServiceProgress(invoice, itemIndex, nextStatus)}
                                disabled={item.serviceStatus === "completed"}
                                className="mt-1 block text-left text-xs font-bold text-violet-700 underline decoration-dotted underline-offset-2 disabled:no-underline disabled:opacity-70"
                              >
                                {item.name}: {actionLabel}
                              </button>
                            );
                          })}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <button
                              onClick={() => handleOpenQuickView(invoice)}
                              className="rounded-md p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                              title="Quick view"
                              aria-label="Quick view invoice"
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleViewPDF(invoice)}
                              className="rounded-md p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                              title="View Invoice"
                              aria-label="View invoice PDF"
                            >
                              <FiDownload className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleShareLink(invoice)}
                              className="rounded-md p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                              title="Share Invoice"
                              aria-label="Share invoice"
                            >
                              <FiMoreHorizontal className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(invoice)}
                              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Edit Invoice"
                              aria-label="Edit invoice"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(invoice._id)}
                              className="rounded-md p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                              title="Delete Invoice"
                              aria-label="Delete invoice"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                            {invoice.balanceDue > 0 && ["sent", "draft", "partial", "overdue"].includes(invoice.status) && (
                              <button
                                onClick={() => handleOpenPaymentModal(invoice)}
                                className="rounded-md p-2 text-amber-700 hover:bg-amber-50"
                                title="Log partial payment"
                                aria-label="Log partial payment"
                              >
                                <FiDollarSign className="h-4 w-4" />
                              </button>
                            )}
                            {(invoice.status === "sent" || invoice.status === "draft") && (
                              <button
                                onClick={() => handleMarkAsPaid(invoice._id)}
                                className="rounded-md p-2 text-emerald-600 hover:bg-emerald-50"
                                title="Mark as Paid"
                                aria-label="Mark as paid"
                              >
                                <FiCheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {hasCollectibleProducts && (!invoice.fulfillmentStatus || invoice.fulfillmentStatus === "pending_pickup") && (
                              <button
                                onClick={() => handleCompletePickup(invoice)}
                                className="rounded-md p-2 text-indigo-700 hover:bg-indigo-50"
                                title="Complete pickup and record sale"
                                aria-label="Complete pickup and record sale"
                              >
                                <FiCheckCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {pagination.totalItems === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}
                -{Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} invoices
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="invoice-page-size" className="text-xs font-bold uppercase tracking-wide">Rows</label>
                <select
                  id="invoice-page-size"
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button
                  type="button"
                  onClick={() => setPage(currentPage => Math.max(1, currentPage - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="min-w-20 text-center font-bold text-slate-700">Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage => Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {paymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">partial payment</p>
                <h2 className="text-2xl font-black text-slate-900">Log payment for invoice #{paymentInvoice.invoiceNumber || paymentInvoice._id?.slice(-6)}</h2>
                <p className="text-sm text-slate-500 mt-2">Use this form to log installments and update the outstanding balance.</p>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="text-slate-500 hover:text-slate-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Amount due</p>
                  <p className="text-3xl font-black text-slate-900">{formatCurrency(paymentInvoice.balanceDue || 0)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Paid so far</p>
                  <p className="text-3xl font-black text-slate-900">{formatCurrency(paymentInvoice.amountPaid || 0)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Payment status</p>
                  <p className="text-3xl font-black text-slate-900">{paymentInvoice.paymentStatus || "Unpaid"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Payment amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-slate-500">Enter the installment amount to log against this invoice.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Payment Date</p>
                  <p className="text-base font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                  <p className="text-sm text-slate-500 mt-2">This record updates the current balance and payment summary.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Payment Method
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="check">Check</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Reference Number (optional)
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="e.g., TRX123456"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-bold text-slate-700">
                Notes (optional)
                <textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Add any notes about this payment..."
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Payment timeline</p>
                  <p className="text-xs text-slate-500">{paymentRecords.length} installment(s)</p>
                </div>

                {paymentRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No installments logged yet. Submit a payment to create a timeline entry.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentRecords.map((entry, index) => (
                      <div key={`${entry.date}-${index}`} className="rounded-2xl border border-slate-200 p-4 bg-white">
                        <p className="font-semibold text-slate-900">{formatCurrency(entry.amount)}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
              <button
                onClick={handleClosePaymentModal}
                className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Log Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">confirm delete</p>
                  <h2 className="text-2xl font-black text-slate-900">Delete invoice</h2>
                  <p className="text-sm text-slate-500 mt-2">This action cannot be undone. The invoice and any linked supplier/customer history will be removed.</p>
                </div>
                <button
                  onClick={handleCloseDeleteModal}
                  className="text-slate-500 hover:text-slate-900"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 rounded-3xl bg-red-50 border border-red-100 p-6">
                <p className="text-sm text-red-700">Are you sure you want to permanently delete this invoice?</p>
                <p className="text-xs text-slate-500 mt-2">This will remove it from the invoice list and adjust associated balances.</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleCloseDeleteModal}
                  className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteInvoice}
                  className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">edit invoice</p>
                <h2 className="text-2xl font-black text-slate-900">Edit #{editInvoice.invoiceNumber || editInvoice._id?.slice(-6)}</h2>
                <p className="text-sm text-slate-500 mt-2">Update invoice details before saving.</p>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="text-slate-500 hover:text-slate-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {editInvoice.transactionType === "incoming" ? "Supplier Name" : "Customer Name"}
                  <input
                    value={editFields.customerName}
                    onChange={e => handleEditFieldChange("customerName", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {editInvoice.transactionType === "incoming" ? "Supplier Email" : "Customer Email"}
                  <input
                    value={editFields.customerEmail}
                    onChange={e => handleEditFieldChange("customerEmail", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {editInvoice.transactionType === "incoming" ? "Supplier Phone" : "Customer Phone"}
                  <input
                    value={editFields.customerPhone}
                    onChange={e => handleEditFieldChange("customerPhone", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Due Date
                  <input
                    type="date"
                    value={editFields.dueDate}
                    onChange={e => handleEditFieldChange("dueDate", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Invoice Type
                  <select
                    value={editFields.invoiceType}
                    onChange={e => handleEditFieldChange("invoiceType", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="quotation">Quotation</option>
                    <option value="proforma">Proforma</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Status
                  <select
                    value={editFields.status}
                    onChange={e => handleEditFieldChange("status", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2 text-sm font-bold text-slate-700">
                Notes
                <textarea
                  value={editFields.notes}
                  onChange={e => handleEditFieldChange("notes", e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
              <button
                onClick={handleCloseEditModal}
                className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 sticky top-0 bg-white">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">invoice preview</p>
                <h2 className="text-2xl font-black text-slate-900">
                  {pdfInvoice?.invoiceNumber || "Invoice"}
                </h2>
              </div>
              <button
                onClick={handleClosePdfModal}
                className="text-slate-500 hover:text-slate-900 text-2xl"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[70vh] bg-slate-50 p-6">
              {pdfLoading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-slate-500">Loading invoice...</p>
                </div>
              ) : pdfInvoice ? (
                <div className="bg-white rounded-lg shadow-sm">
                  <InvoicePDFTemplate ref={pdfRef} invoice={pdfInvoice} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-slate-500">Unable to load invoice</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end sticky bottom-0">
              <button
                onClick={handleClosePdfModal}
                className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-2xl border border-blue-300 px-6 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50"
                title="Print invoice"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => handleDownloadPdf('jpg')}
                disabled={pdfLoading}
                className="rounded-2xl border border-green-300 px-6 py-3 text-sm font-bold text-green-600 hover:bg-green-50 disabled:opacity-50"
                title="Download as JPG image"
              >
                {pdfLoading ? "Downloading..." : "📷 JPG"}
              </button>
              <button
                onClick={() => handleDownloadPdf('pdf')}
                disabled={pdfLoading}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                title="Download as PDF"
              >
                {pdfLoading ? "Downloading..." : "📥 PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {quickViewInvoice && (
        <div className="fixed inset-0 z-50 flex">
          <button type="button" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={handleCloseQuickView} aria-label="Close invoice details" />
          <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Invoice details</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">#{quickViewInvoice.invoiceNumber || quickViewInvoice._id?.slice(-6)}</h2>
                <p className="mt-1 text-sm text-slate-500">{quickViewInvoice.customerName || quickViewInvoice.customer?.name || quickViewInvoice.supplier?.name || "Counterparty unavailable"}</p>
              </div>
              <button type="button" onClick={handleCloseQuickView} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Close invoice details">
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {quickViewLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading invoice details...</div>
            ) : (
              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total amount</p>
                    <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(quickViewInvoice.totalAmount || 0)}</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Balance due</p>
                    <p className="mt-2 text-xl font-bold text-amber-800">{formatCurrency(quickViewInvoice.balanceDue || 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-slate-200 py-5 text-sm dark:border-slate-800">
                  <div><p className="text-xs text-slate-400">Issue date</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{quickViewInvoice.createdAt ? new Date(quickViewInvoice.createdAt).toLocaleDateString() : "N/A"}</p></div>
                  <div><p className="text-xs text-slate-400">Due date</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{quickViewInvoice.dueDate ? new Date(quickViewInvoice.dueDate).toLocaleDateString() : "No due date"}</p></div>
                  <div><p className="text-xs text-slate-400">Payment status</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{quickViewInvoice.paymentStatus || "Unpaid"}</p></div>
                  <div><p className="text-xs text-slate-400">Invoice status</p><p className="mt-1 font-semibold capitalize text-slate-800 dark:text-slate-200">{quickViewInvoice.status || "draft"}</p></div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment history</h3><span className="text-xs text-slate-400">{quickViewPayments.length} entries</span></div>
                  {quickViewPayments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No payments recorded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {quickViewPayments.map((payment, index) => (
                        <div key={`${payment.date || "payment"}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
                          <div><p className="font-semibold text-slate-800 dark:text-slate-200">{payment.paymentMethod || "Payment"}</p><p className="text-xs text-slate-500">{payment.date ? new Date(payment.date).toLocaleDateString() : "Date unavailable"}</p></div>
                          <span className="font-bold text-emerald-700">{formatCurrency(payment.amount || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleOpenPaymentModal(quickViewInvoice)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><FiDollarSign className="h-4 w-4" /> Log payment</button>
                  <button type="button" onClick={() => handleViewPDF(quickViewInvoice)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FiDownload className="h-4 w-4" /> View PDF</button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {isInvoiceDrawerMounted && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm drawer-backdrop ${newInvoiceModalOpen ? "open" : ""}`}
            onClick={closeInvoiceDrawer}
          />
          <div
            className={`ml-auto h-full w-full max-w-5xl overflow-y-auto bg-white shadow-2xl drawer-panel dark:border-l dark:border-slate-700 dark:bg-slate-900 ${newInvoiceModalOpen ? "open" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">new invoice</p>
                <h2 className="text-2xl font-black text-slate-900">Create invoice</h2>
              </div>
              <button
                onClick={closeInvoiceDrawer}
                className="text-slate-500 hover:text-slate-900 text-2xl"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Invoice Type
                  <select
                    value={newInvoiceDraft.invoiceType}
                    onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, invoiceType: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="quotation">Quotation</option>
                    <option value="proforma">Proforma</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Transaction Type
                  <select
                    value={newInvoiceDraft.transactionType}
                    onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, transactionType: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="outgoing">Customer Invoice</option>
                    <option value="incoming">Supplier Invoice</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Branch
                  <select
                    value={newInvoiceDraft.branch}
                    onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Head Office</option>
                    {branches.map(branch => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="relative space-y-2 text-sm font-bold text-slate-700">
                  <label htmlFor="invoice-customer-name">
                    {newInvoiceDraft.transactionType === "incoming" ? "Supplier Name" : "Customer Name"}
                  </label>
                  <input
                    id="invoice-customer-name"
                    value={newInvoiceDraft.customerName}
                    onFocus={() => newInvoiceDraft.transactionType === "outgoing" && setCustomerLookupOpen(true)}
                    onChange={(e) => newInvoiceDraft.transactionType === "outgoing"
                      ? handleCustomerLookupChange("customerName", e.target.value)
                      : setNewInvoiceDraft(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder={newInvoiceDraft.transactionType === "incoming" ? "Supplier name" : "Search customer name"}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  {newInvoiceDraft.transactionType === "outgoing" && customerLookupOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {customerMatches.map(customer => (
                        <button
                          key={customer._id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="block w-full px-4 py-3 text-left hover:bg-blue-50"
                        >
                          <span className="block font-bold text-slate-900">{customer.name}</span>
                          {(customer.phone || customer.email) && (
                            <span className="block text-xs font-normal text-slate-500">
                              {[customer.phone, customer.email].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleOpenCustomerCreation}
                        className="w-full border-t border-slate-100 px-4 py-3 text-left font-bold text-blue-600 hover:bg-blue-50"
                      >
                        + Create New Customer
                      </button>
                      {!customerMatches.length && !newInvoiceDraft.customerName.trim() && (
                        <p className="px-4 py-3 text-xs font-normal text-slate-500">Type a name or phone number to search.</p>
                      )}
                    </div>
                  )}
                </div>

                {newInvoiceDraft.transactionType === "incoming" && (
                  <label className="space-y-2 text-sm font-bold text-slate-700">
                    Supplier
                    <select
                      value={newInvoiceDraft.supplier}
                      onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {newInvoiceDraft.transactionType === "incoming" ? "Supplier Email" : "Customer Email"}
                  <input
                    type="email"
                    value={newInvoiceDraft.customerEmail}
                    onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {newInvoiceDraft.transactionType === "incoming" ? "Supplier Phone" : "Customer Phone"}
                  <input
                    value={newInvoiceDraft.customerPhone}
                    onFocus={() => newInvoiceDraft.transactionType === "outgoing" && setCustomerLookupOpen(true)}
                    onChange={(e) => newInvoiceDraft.transactionType === "outgoing"
                      ? handleCustomerLookupChange("customerPhone", e.target.value)
                      : setNewInvoiceDraft(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="+234..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Due Date
                  <input
                    type="date"
                    value={newInvoiceDraft.dueDate}
                    onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900">Invoice Items</h3>
                  <button
                    type="button"
                    onClick={addNewInvoiceItem}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {(newInvoiceDraft.items || []).map((item, index) => {
                    const selectedCatalogItem = productCatalog.find(catalogItem =>
                      catalogItem._id === (item.product || item.service)
                    );

                    return (
                      <div key={`${item.product || "new"}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">Item {index + 1}</span>
                          {(newInvoiceDraft.items.length > 1) && (
                            <button
                              type="button"
                              onClick={() => removeNewInvoiceItem(index)}
                              className="text-xs font-bold text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <label className="space-y-2 text-sm font-bold text-slate-700 md:col-span-2 relative">
                            Product or Service
                            <input
                              type="text"
                              placeholder="Type product or service name..."
                              value={productDropdownIndex === index ? productSearch : (selectedCatalogItem?.name || item.name || "")}
                              onChange={(e) => {
                                setProductDropdownIndex(index);
                                setProductSearch(e.target.value);
                              }}
                              onFocus={() => setProductDropdownIndex(index)}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                            {productDropdownIndex === index && productSearch.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg z-10 max-h-48 overflow-y-auto">
                                {productCatalog.length > 0 ? (
                                  <>
                                    {productCatalog
                                      .filter(product => {
                                        const searchLower = productSearch.toLowerCase();
                                        return product.name.toLowerCase().includes(searchLower) ||
                                          (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
                                          (product.code && product.code.toLowerCase().includes(searchLower));
                                      })
                                      .map(product => {
                                        const stockDisplay = product.catalogType === "service"
                                          ? "Service"
                                          : `${product.stock ?? 0} in stock`;
                                        return (
                                          <button
                                            key={product._id}
                                            type="button"
                                            onClick={() => {
                                              updateNewInvoiceItem(index, "product", product._id);
                                              setProductDropdownIndex(null);
                                              setProductSearch("");
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 text-sm text-slate-700 transition-colors"
                                          >
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-slate-500">{stockDisplay}</div>
                                          </button>
                                        );
                                      })}
                                    {productCatalog.filter(p => {
                                      const searchLower = productSearch.toLowerCase();
                                      return p.name.toLowerCase().includes(searchLower) ||
                                        (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
                                        (p.code && p.code.toLowerCase().includes(searchLower));
                                    }).length === 0 && (
                                      <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                        No products found for "{productSearch}"
                                      </div>
                                    )}
                                  </>
                                ) : loadingProducts ? (
                                  <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                    Loading products...
                                  </div>
                                ) : (
                                  <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                    Loading products...
                                  </div>
                                )}
                              </div>
                            )}
                          </label>

                          <label className="space-y-2 text-sm font-bold text-slate-700">
                            Quantity
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateNewInvoiceItem(index, "quantity", Number(e.target.value || 0))}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </label>

                          <label className="space-y-2 text-sm font-bold text-slate-700">
                            Unit Price
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateNewInvoiceItem(index, "price", Number(e.target.value || 0))}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </label>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {selectedCatalogItem?.catalogType === "product"
                              ? `Available stock: ${selectedCatalogItem.stock ?? 0}`
                              : selectedCatalogItem?.catalogType === "service"
                                ? "Service"
                                : "Choose a product or service"}
                          </span>
                          <span className="font-bold text-slate-700">
                            Line total: {formatCurrency(Number(item.total || 0))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Tax
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newInvoiceDraft.tax}
                    onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, tax: Number(e.target.value || 0) }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>

                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Discount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newInvoiceDraft.discount}
                    onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, discount: Number(e.target.value || 0) }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(calculateInvoiceDraftTotals().subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>{formatCurrency(Number(newInvoiceDraft.tax || 0))}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(newInvoiceDraft.discount || 0))}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(calculateInvoiceDraftTotals().totalAmount)}</span>
                </div>
              </div>

              <label className="block space-y-2 text-sm font-bold text-slate-700">
                Notes
                <textarea
                  value={newInvoiceDraft.notes}
                  onChange={(e) => setNewInvoiceDraft(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
              <button
                onClick={closeInvoiceDrawer}
                className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={creatingInvoice}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingInvoice ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {customerCreationOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => setCustomerCreationOpen(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">CRM</p>
                <h2 className="text-2xl font-black text-slate-900">Create New Customer</h2>
              </div>
              <button
                type="button"
                onClick={() => setCustomerCreationOpen(false)}
                className="text-2xl text-slate-400 hover:text-slate-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                Name *
                <input
                  autoFocus
                  value={newCustomerFields.name}
                  onChange={(e) => setNewCustomerFields(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Phone
                <input
                  value={newCustomerFields.phone}
                  onChange={(e) => setNewCustomerFields(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+234..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Email
                <input
                  type="email"
                  value={newCustomerFields.email}
                  onChange={(e) => setNewCustomerFields(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCustomerCreationOpen(false)}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomer}
                disabled={customerCreating}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {customerCreating ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE INVOICE MODAL */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Share Invoice {shareInvoiceData?.invoiceNumber}
              </h2>
              <p className="mt-2 text-gray-600">
                Send this invoice to a customer via email
              </p>
            </div>

            {/* RECIPIENT EMAIL */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Recipient Email *
              </label>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter recipient email address"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* MESSAGE */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Add a custom message to include in the email"
                rows="4"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* EMAIL HISTORY */}
            {emailHistory.length > 0 && (
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Previous Emails Sent
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {emailHistory.map((email, index) => (
                    <div
                      key={index}
                      className="text-xs bg-white p-2 rounded border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {email.recipientEmail}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            email.status === "sent"
                              ? "bg-green-100 text-green-800"
                              : email.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {email.status}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-600">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">
                          {email.emailType.replace(/_/g, " ")}
                        </span>
                        {new Date(email.sentAt || email.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitShare}
                disabled={sharing || !shareEmail}
                className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sharing ? "Sending..." : "✉️ Send Invoice"}
              </button>
              <button
                onClick={handleCloseShareModal}
                disabled={sharing}
                className="flex-1 rounded-lg bg-gray-300 px-6 py-3 text-sm font-bold text-gray-800 hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Invoices;