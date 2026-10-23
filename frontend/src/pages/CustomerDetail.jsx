import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiMail, FiMapPin, FiMessageCircle, FiPhone, FiUser } from "react-icons/fi";
import { getCustomer } from "../api/customers.js";
import { formatCurrency } from "../utils/formatters.js";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
}) : "—";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCustomer = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getCustomer(id);
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err.message || "Unable to load this customer.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) loadCustomer();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <section className="mx-auto max-w-7xl p-6 text-sm text-slate-500">Loading customer details...</section>;
  }

  if (error || !data?.customer) {
    return (
      <section className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/50 dark:bg-rose-950/20">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Customer unavailable</h1>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error || "This customer could not be found."}</p>
          <button type="button" onClick={() => navigate("/app/customers")} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <FiArrowLeft /> Back to customers
          </button>
        </div>
      </section>
    );
  }

  const { customer, sales = [], invoices = [] } = data;
  const quotes = invoices.filter((invoice) => invoice.invoiceType === "quotation");
  const regularInvoices = invoices.filter((invoice) => invoice.invoiceType !== "quotation");
  const serviceItems = invoices.flatMap((invoice) => (invoice.items || [])
    .filter((item) => item.service)
    .map((item, index) => ({
      ...item,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      key: `${invoice._id}-${index}`
    })));
  const summary = [
    { label: "Total spent", value: formatCurrency(customer.totalSpent || 0) },
    { label: "Outstanding balance", value: formatCurrency(customer.outstandingBalance || 0) },
    { label: "Sales", value: sales.length },
    { label: "Quotes", value: quotes.length }
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <FiArrowLeft />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Customer profile</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">{customer.name}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${customer.isActive === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>
            {customer.isActive === false ? "Inactive" : "Active"}
          </span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Contact details</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3"><FiPhone className="mt-0.5 shrink-0" /><span>{customer.phone || "No phone number"}</span></div>
              <div className="flex items-start gap-3"><FiMail className="mt-0.5 shrink-0" /><span className="break-all">{customer.email || "No email address"}</span></div>
              <div className="flex items-start gap-3"><FiMapPin className="mt-0.5 shrink-0" /><span>{customer.address || "No address on file"}</span></div>
              <div className="flex items-start gap-3"><FiUser className="mt-0.5 shrink-0" /><span>{customer.loyaltyPoints || 0} loyalty points</span></div>
              <div className="flex items-start gap-3"><FiCalendar className="mt-0.5 shrink-0" /><span>Last purchase: {formatDate(customer.lastPurchaseAt)}</span></div>
              <div className="flex items-start gap-3">
                <FiMessageCircle className="mt-0.5 shrink-0" />
                <span>
                  WhatsApp follow-ups: {customer.whatsappFollowUpConsent ? "Opted in" : "Not opted in"}
                  {customer.whatsappFollowUpConsentAt && <span className="block text-xs text-slate-500">Recorded {formatDate(customer.whatsappFollowUpConsentAt)}</span>}
                </span>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notes</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{customer.notes || "No notes saved for this customer."}</p>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quotes</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Quote</th><th className="pb-3 pr-4">Date created</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">Valid until</th><th className="pb-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {quotes.length ? quotes.map((invoice) => (
                    <tr key={invoice._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber || "Quote"}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.createdAt)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.totalAmount || 0)}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.dueDate)}</td>
                      <td className="py-3">{invoice.status || "Draft"}</td>
                    </tr>
                  )) : <tr><td colSpan="5" className="py-6 text-center text-slate-500">No quotes recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invoices</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Invoice</th><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">Balance</th><th className="pb-3">Payment</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {regularInvoices.length ? regularInvoices.map((invoice) => (
                    <tr key={invoice._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber || "Invoice"}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.createdAt)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.totalAmount || 0)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.balanceDue || 0)}</td>
                      <td className="py-3">{invoice.paymentStatus || "Unpaid"}</td>
                    </tr>
                  )) : <tr><td colSpan="5" className="py-6 text-center text-slate-500">No invoices recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Service history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Service</th><th className="pb-3 pr-4">Order</th><th className="pb-3 pr-4">Recorded</th><th className="pb-3">Progress</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {serviceItems.length ? serviceItems.map((item) => (
                    <tr key={item.key} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{item.name || "Service"}</td>
                      <td className="py-3 pr-4">{item.invoiceNumber || "Invoice"}</td>
                      <td className="py-3 pr-4">{formatDate(item.createdAt)}</td>
                      <td className="py-3 capitalize">{String(item.serviceStatus || "pending").replace("_", " ")}</td>
                    </tr>
                  )) : <tr><td colSpan="4" className="py-6 text-center text-slate-500">No service work recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sales history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Receipt</th><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Total</th><th className="pb-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sales.length ? sales.map((sale) => (
                    <tr key={sale._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{sale.receiptId || sale._id?.slice(-8) || "Sale"}</td>
                      <td className="py-3 pr-4">{formatDate(sale.createdAt)}</td>
                      <td className="py-3 pr-4">{formatCurrency(sale.totalAmount || 0)}</td>
                      <td className="py-3">{sale.status || "Completed"}</td>
                    </tr>
                  )) : <tr><td colSpan="4" className="py-6 text-center text-slate-500">No sales recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default CustomerDetail;