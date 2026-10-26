import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiEdit2, FiMail, FiMessageCircle, FiPhone, FiPlus, FiSearch, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../api/customers.js";
import { getStaff } from "../api/staff.js";
import { formatCurrency } from "../utils/formatters.js";
import { useAuth } from "../context/AuthContext.jsx";
import AutocompleteSearch from "../components/AutocompleteSearch.jsx";
import { openWhatsAppMessage } from "../utils/whatsappMessages.js";

const createEmptyForm = () => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  whatsappFollowUpConsent: false,
  status: "active",
  outstandingBalance: "0",
  totalSpent: "0",
  totalOrders: "1",
});

const Customers = () => {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const canManageCustomers = user?.role === "owner" || user?.role === "super_admin" || user?.permissions?.canManageCustomers === true;
  const canMessageStaff = user?.role === "owner" || user?.role === "super_admin" || user?.permissions?.canManageStaff === true;
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageRecipientType, setMessageRecipientType] = useState("customer");
  const [messageCustomerId, setMessageCustomerId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffLoadError, setStaffLoadError] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", address: "", notes: "", isActive: true, whatsappFollowUpConsent: false });
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState(createEmptyForm());

  useEffect(() => {
    const load = async () => {
      const data = await getCustomers();
      setCustomers(data || []);
    };

    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filter, pageSize]);

  useEffect(() => {
    if (!deleteTarget) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deletingCustomer) {
        setDeleteTarget(null);
        setDeleteError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteTarget, deletingCustomer]);

  const filteredCustomers = useMemo(() => {
    const query = search.toLowerCase();

    return customers.filter((customer) => {
      const matchesQuery =
        !query ||
        [customer.name, customer.phone, customer.email, customer.address]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      if (!matchesQuery) return false;

      const totalOutstanding = Number(customer.outstandingBalance || customer.balance || 0);
      const isActive = customer.status === "active" || customer.isActive === true;
      const isOwing = totalOutstanding > 0;
      const needsAttention = !String(customer.phone || "").trim() && !String(customer.email || "").trim();

      switch (filter) {
        case "active":
          return isActive;
        case "owing":
          return isOwing;
        case "vip":
          return Number(customer.totalSpent || 0) > 500000;
        case "attention":
          return needsAttention;
        default:
          return true;
      }
    });
  }, [customers, filter, search]);

  const pageCount = Math.ceil(filteredCustomers.length / pageSize);
  const currentPage = Math.min(page, pageCount || 1);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedCustomers = filteredCustomers.slice(pageStart, pageStart + pageSize);
  const firstPageButton = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageButtons = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => firstPageButton + index);

  const summary = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((customer) => customer.status === "active" || customer.isActive === true).length;
    const attentionRequired = customers.filter((customer) => !String(customer.phone || "").trim() && !String(customer.email || "").trim()).length;
    const outstandingBalance = customers.reduce((sum, customer) => sum + Number(customer.outstandingBalance || customer.balance || 0), 0);
    const newThisMonth = customers.filter((customer) => {
      const createdAt = customer.createdAt || customer.created_at;
      if (!createdAt) return false;
      const date = new Date(createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return { totalCustomers, activeCustomers, attentionRequired, outstandingBalance, newThisMonth };
  }, [customers]);

  const filterOptions = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "owing", label: "Owing Balance" },
    { key: "vip", label: "VIP / Frequent" },
    { key: "attention", label: `Attention required (${summary.attentionRequired})` },
  ];

  const openCreateDrawer = () => {
    setForm(createEmptyForm());
    setDrawerOpen(true);
  };

  const openMessageComposer = (customer = null) => {
    const target = customer || customers[0];
    setMessageRecipientType("customer");
    setMessageCustomerId(target?._id || "");
    setMessageDraft(target
      ? `Hello ${target.name || "there"},\n\nWe have new products in stock and thought you might be interested. Reply to this message if you would like to know more.`
      : "");
    setMessageModalOpen(true);
  };

  const handleMessageCustomerChange = (event) => {
    const recipient = messageRecipientType === "staff"
      ? staff.find((item) => item._id === event.target.value)
      : customers.find((item) => item._id === event.target.value);
    setMessageCustomerId(event.target.value);
    setMessageDraft(recipient
      ? `Hello ${recipient.name || "there"},\n\nWe have new products in stock and thought you might be interested. Reply to this message if you would like to know more.`
      : "");
  };

  const handleMessageRecipientTypeChange = async (event) => {
    const recipientType = event.target.value;
    setMessageRecipientType(recipientType);
    setStaffLoadError("");
    if (recipientType === "customer") {
      const customer = customers[0];
      setMessageCustomerId(customer?._id || "");
      setMessageDraft(customer
        ? `Hello ${customer.name || "there"},\n\nWe have new products in stock and thought you might be interested. Reply to this message if you would like to know more.`
        : "");
      return;
    }

    if (staff.length) {
      setMessageCustomerId(staff[0]._id);
      setMessageDraft(`Hello ${staff[0].name || "there"},\n\n`);
      return;
    }

    try {
      setStaffLoading(true);
      const staffList = await getStaff();
      const availableStaff = Array.isArray(staffList) ? staffList : [];
      setStaff(availableStaff);
      setMessageCustomerId(availableStaff[0]?._id || "");
      setMessageDraft(availableStaff[0] ? `Hello ${availableStaff[0].name || "there"},\n\n` : "");
      if (!availableStaff.length) setStaffLoadError("No staff members are available to message.");
    } catch (err) {
      setStaffLoadError(err.message || "Unable to load staff contacts.");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleSendWhatsAppDraft = () => {
    const recipient = messageRecipientType === "staff"
      ? staff.find((item) => item._id === messageCustomerId)
      : customers.find((item) => item._id === messageCustomerId);
    const phone = recipient?.phone || recipient?.phoneNumber;
    if (!phone) {
      alert(`Add a phone number to this ${messageRecipientType} profile before opening WhatsApp.`);
      return;
    }
    if (!messageDraft.trim()) {
      alert("Write a message before opening WhatsApp.");
      return;
    }
    const message = business?.name
      ? `${messageDraft.trim()}\n\n${business.name}`
      : messageDraft.trim();
    if (!openWhatsAppMessage(phone, message)) {
      alert("Could not open WhatsApp. Check the phone number and allow pop-ups, then try again.");
      return;
    }
    setMessageModalOpen(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedEmail = form.email.trim();
    const emailIsValid = !trimmedEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    const phoneIsValid = !trimmedPhone || /^[+()\d\s-]{7,20}$/.test(trimmedPhone);

    if (!trimmedName) {
      alert("Customer name is required.");
      return;
    }

    if (!emailIsValid) {
      alert("Please enter a valid email address, or leave it blank.");
      return;
    }

    if (!phoneIsValid) {
      alert("Please enter a valid phone number, or leave it blank.");
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        address: form.address.trim(),
        notes: "",
        totalSpent: Number(form.totalSpent || 0),
        totalOrders: Number(form.totalOrders || 1),
        outstandingBalance: Number(form.outstandingBalance || 0),
        isActive: form.status !== "inactive",
        whatsappFollowUpConsent: form.whatsappFollowUpConsent
      };

      const newCustomer = await createCustomer(payload);
      setCustomers((current) => [newCustomer, ...current]);
      setDrawerOpen(false);
      setPreviewCustomer(newCustomer);
    } catch (err) {
      console.error("Failed to create customer:", err);
      alert(err.message || "Failed to create customer");
    }
  };

  const openCustomerEditor = (customer) => {
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      isActive: customer.isActive !== false,
      whatsappFollowUpConsent: customer.whatsappFollowUpConsent === true
    });
    setEditingCustomer(customer);
  };

  const handleCustomerUpdate = async (event) => {
    event.preventDefault();
    const name = editForm.name.trim();
    const phone = editForm.phone.trim();
    const email = editForm.email.trim();

    if (!name) {
      alert("Customer name is required.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address, or leave it blank.");
      return;
    }
    if (phone && !/^[+()\d\s-]{7,20}$/.test(phone)) {
      alert("Please enter a valid phone number, or leave it blank.");
      return;
    }

    try {
      setSavingEdit(true);
      const updated = await updateCustomer(editingCustomer._id, {
        name,
        phone,
        email,
        address: editForm.address.trim(),
        notes: editForm.notes.trim(),
        isActive: editForm.isActive,
        whatsappFollowUpConsent: editForm.whatsappFollowUpConsent
      });
      setCustomers((current) => current.map((customer) => customer._id === updated._id ? updated : customer));
      setPreviewCustomer(updated);
      setEditingCustomer(null);
    } catch (err) {
      console.error("Failed to update customer:", err);
      alert(err.message || "Failed to update customer.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteConfirmation = (customer) => {
    setDeleteTarget(customer);
    setDeleteError("");
  };

  const handleCustomerDelete = async () => {
    if (!deleteTarget || deletingCustomer) return;

    try {
      setDeletingCustomer(true);
      setDeleteError("");
      await deleteCustomer(deleteTarget._id);
      setCustomers((current) => current.filter((customer) => customer._id !== deleteTarget._id));
      setDeleteTarget(null);
      setDeleteError("");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete customer.");
    } finally {
      setDeletingCustomer(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
              CRM
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Customer relationships
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage contacts, balances, and customer growth in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openMessageComposer()}
              disabled={customers.length === 0 && !canMessageStaff}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all duration-150 hover:bg-emerald-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-300"
            >
              <FiMessageCircle />
              Draft WhatsApp
            </button>
            {canManageCustomers && (
              <button
                type="button"
                onClick={openCreateDrawer}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 active:scale-[0.99]"
              >
                <FiPlus />
                Add Customer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Customers", value: summary.totalCustomers, tone: "emerald" },
          { label: "Active Accounts", value: summary.activeCustomers, tone: "sky" },
          { label: "Outstanding Balance", value: formatCurrency(summary.outstandingBalance), tone: "amber" },
          { label: "New This Month", value: summary.newThisMonth, tone: "slate" },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-[24px] border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              card.tone === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                : card.tone === "sky"
                  ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
                  : card.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            <p className="text-sm font-medium">{card.label}</p>
            <p className="mt-4 text-2xl font-semibold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label className="sr-only" htmlFor="customer-search">
              Search customers
            </label>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <AutocompleteSearch
                id="customer-search"
                value={search}
                onChange={setSearch}
                suggestions={customers.map((customer) => customer.name)}
                placeholder="Search by name, phone, or email"
                className="w-full"
                inputClassName="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none ring-0 transition-all duration-150 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.99] ${
                  filter === option.key
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 hidden overflow-x-auto lg:block">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Value</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No matching customers found.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const totalOutstanding = Number(customer.outstandingBalance || customer.balance || 0);
                  const isActive = customer.status === "active" || customer.isActive === true;
                  const isOwing = totalOutstanding > 0;
                  const needsAttention = !String(customer.phone || "").trim() && !String(customer.email || "").trim();
                  const statusClasses = isOwing
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

                  return (
                    <tr key={customer._id} className="text-sm text-slate-700 dark:text-slate-300">
                      <td className="px-3 py-4">
                        <div>
                          <p className="font-semibold">{customer.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {customer.address || "No address on file"}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div>
                          <p>{customer.phone || "—"}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{customer.email || "—"}</p>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div>
                          <p>{formatCurrency(customer.totalSpent || 0)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {customer.totalOrders || 0} orders
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {needsAttention && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Attention required</span>}
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
                            {isOwing ? "Owing" : isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewCustomer(customer)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            View
                          </button>
                          {needsAttention && canManageCustomers && (
                            <button
                              type="button"
                              onClick={() => openCustomerEditor(customer)}
                              className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                            >
                              Add contact details
                            </button>
                          )}
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Invoice
                          </button>
                          {canManageCustomers && (
                            <button
                              type="button"
                              onClick={() => openDeleteConfirmation(customer)}
                              aria-label={`Delete ${customer.name}`}
                              className="inline-flex items-center justify-center rounded-lg border border-rose-200 p-2 text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                            >
                              <FiTrash2 aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 space-y-3 lg:hidden">
          {paginatedCustomers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No matching customers found.
            </div>
          ) : (
            paginatedCustomers.map((customer) => {
              const totalOutstanding = Number(customer.outstandingBalance || customer.balance || 0);
              const isActive = customer.status === "active" || customer.isActive === true;
              const isOwing = totalOutstanding > 0;
              const needsAttention = !String(customer.phone || "").trim() && !String(customer.email || "").trim();

              return (
                <div key={customer._id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{customer.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{customer.phone || customer.email || "No contact info"}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {needsAttention && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Attention required</span>}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isOwing ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {isOwing ? "Owing" : isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{formatCurrency(customer.totalSpent || 0)}</span>
                    <span>{customer.totalOrders || 0} orders</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewCustomer(customer)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      View profile
                    </button>
                    {needsAttention && canManageCustomers && (
                      <button
                        type="button"
                        onClick={() => openCustomerEditor(customer)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition-all duration-150 hover:bg-rose-50 active:scale-[0.99] dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300"
                      >
                        Add contact details
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      Invoice
                    </button>
                    {canManageCustomers && (
                      <button
                        type="button"
                        onClick={() => openDeleteConfirmation(customer)}
                        aria-label={`Delete ${customer.name}`}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-rose-700 transition-all duration-150 hover:bg-rose-50 active:scale-[0.99] dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300"
                      >
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <span>
              Showing {filteredCustomers.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
            </span>
            <label className="flex items-center gap-2">
              Rows per page
              <select
                aria-label="Customers per page"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>
          <nav aria-label="Customer pages" className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FiChevronLeft aria-hidden="true" />
            </button>
            {pageButtons.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-label={`Page ${pageNumber}`}
                aria-current={currentPage === pageNumber ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
                className={`min-w-9 rounded-lg px-2.5 py-2 text-sm font-medium ${
                  currentPage === pageNumber
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={currentPage >= pageCount}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FiChevronRight aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-customer-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-rose-100 p-3 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <FiTrash2 aria-hidden="true" />
              </div>
              <div>
                <h2 id="delete-customer-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete customer?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Permanently delete <span className="font-semibold">{deleteTarget.name}</span>? Customers with a balance or linked sales/invoices cannot be deleted, to protect transaction history.
                </p>
              </div>
            </div>
            {deleteError && (
              <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                disabled={deletingCustomer}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomerDelete}
                disabled={deletingCustomer}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingCustomer ? "Deleting..." : "Delete customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">CRM</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">New Customer</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create a new customer profile and start tracking their value immediately.</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                <FiX />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">Customer name</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Ava Stone"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">Status</span>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">Phone</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                    placeholder="555-0100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">Email</span>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                    placeholder="ava@example.com"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-slate-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-200">
                <input
                  type="checkbox"
                  name="whatsappFollowUpConsent"
                  checked={form.whatsappFollowUpConsent}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  Customer agreed to WhatsApp follow-ups
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Only opted-in customers appear in the 7-day follow-up reminders.</span>
                </span>
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="mb-2 block">Address</span>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                  placeholder="123 Main Street"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">Total spent</span>
                  <input
                    name="totalSpent"
                    type="number"
                    value={form.totalSpent}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">Orders</span>
                  <input
                    name="totalOrders"
                    type="number"
                    value={form.totalOrders}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">Balance</span>
                  <input
                    name="outstandingBalance"
                    type="number"
                    value={form.outstandingBalance}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-700 active:scale-[0.99]"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">Customer profile</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{previewCustomer.name}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{previewCustomer.address || "No address on file"}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCustomer(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                <FiX />
              </button>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <FiUsers />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Customer status</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{previewCustomer.isActive === false ? "Inactive" : "Active"}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Lifetime spend</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(previewCustomer.totalSpent || 0)}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Outstanding balance</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(previewCustomer.outstandingBalance || 0)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <FiPhone />
                <span>{previewCustomer.phone || "No phone number"}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <FiMail />
                <span>{previewCustomer.email || "No email on record"}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setPreviewCustomer(null);
                  navigate(`/app/customers/${previewCustomer._id}`);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open full profile
              </button>
              {canManageCustomers && (
                <button
                  type="button"
                  onClick={() => openCustomerEditor(previewCustomer)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <FiEdit2 /> Edit customer
                </button>
              )}
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Account activity</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {previewCustomer.totalOrders || 0} recorded orders
                {previewCustomer.lastPurchaseAt ? ` · Last purchase ${new Date(previewCustomer.lastPurchaseAt).toLocaleDateString()}` : " · No purchase date recorded"}
              </p>
            </div>
          </div>
        </div>
      )}

      {messageModalOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="customer-message-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">CRM</p>
                <h2 id="customer-message-title" className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Draft WhatsApp message</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review and edit the message here, then finish sending it in WhatsApp.</p>
              </div>
              <button type="button" onClick={() => setMessageModalOpen(false)} aria-label="Close message composer" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300">
                <FiX />
              </button>
            </div>

            {canMessageStaff && (
              <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="mb-2 block">Recipient type</span>
                <select value={messageRecipientType} onChange={handleMessageRecipientTypeChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                </select>
              </label>
            )}
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-2 block">{messageRecipientType === "staff" ? "Staff member" : "Customer"}</span>
              <select value={messageCustomerId} onChange={handleMessageCustomerChange} disabled={staffLoading} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                {(messageRecipientType === "staff" ? staff : customers).map((recipient) => (
                  <option key={recipient._id} value={recipient._id}>{recipient.name}{(recipient.phone || recipient.phoneNumber) ? ` · ${recipient.phone || recipient.phoneNumber}` : " · No phone number"}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-2 block">Message</span>
              <textarea value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} rows="7" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            {staffLoadError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{staffLoadError}</p>}
            {messageRecipientType === "customer" && !customers.find((customer) => customer._id === messageCustomerId)?.whatsappFollowUpConsent && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">WhatsApp follow-up consent is not recorded for this customer. Confirm they have agreed to receive messages before contacting them.</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setMessageModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button type="button" onClick={handleSendWhatsAppDraft} disabled={!messageCustomerId || !messageDraft.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                <FiMessageCircle /> Open WhatsApp
              </button>
            </div>
          </section>
        </div>
      )}

      {editingCustomer && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <form onSubmit={handleCustomerUpdate} className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">CRM</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Edit customer</h2>
              </div>
              <button type="button" onClick={() => setEditingCustomer(null)} aria-label="Close edit customer" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300">
                <FiX />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { name: "name", label: "Customer name", required: true },
                { name: "phone", label: "Phone" },
                { name: "email", label: "Email", type: "email" },
                { name: "address", label: "Address" }
              ].map((field) => (
                <label key={field.name} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">{field.label}</span>
                  <input
                    name={field.name}
                    type={field.type || "text"}
                    required={field.required}
                    value={editForm[field.name]}
                    onChange={(event) => setEditForm((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                      ...(field.name === "phone" && event.target.value !== editingCustomer.phone
                        ? { whatsappFollowUpConsent: false }
                        : {})
                    }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              ))}

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="mb-2 block">Notes</span>
                <textarea
                  value={editForm.notes}
                  onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                  rows="4"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Active customer
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-slate-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={editForm.whatsappFollowUpConsent}
                  onChange={(event) => setEditForm((current) => ({ ...current, whatsappFollowUpConsent: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  Customer agreed to WhatsApp follow-ups
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Turn this off if the customer withdraws consent. Only opted-in customers receive reminders.</span>
                  {editingCustomer.whatsappFollowUpConsentAt && (
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Consent recorded {new Date(editingCustomer.whatsappFollowUpConsentAt).toLocaleDateString()}.</span>
                  )}
                </span>
              </label>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => setEditingCustomer(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={savingEdit} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {savingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default Customers;