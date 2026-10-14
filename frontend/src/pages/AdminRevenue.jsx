import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import request from "../api/client.js";

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" }
];

const ACCENT_BAR = {
  indigo: "bg-indigo-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500"
};

const money = (amount, currency = "NGN", compact = false) => new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency,
  notation: compact ? "compact" : "standard",
  maximumFractionDigits: compact ? 1 : 2
}).format(Number(amount || 0));

const changeLabel = (value) => {
  if (value === null || value === undefined) return "No previous-period baseline";
  if (value === 0) return "No change vs previous period";
  return `${value > 0 ? "+" : ""}${value}% vs previous period`;
};

const platformChangeLabel = (current, previous) => {
  if (!previous) return current ? "New tracked receipts" : "No previous-period baseline";
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs previous period`;
};

const StatCard = ({ label, value, detail, accent = "indigo", onClick }) => {
  const contents = (
    <>
    <div className={`mb-4 h-1 w-10 rounded-full ${ACCENT_BAR[accent] || ACCENT_BAR.indigo}`} />
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
    <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}: ${value}. View details`}
        className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {contents}
        <span className="mt-3 block text-xs font-bold text-indigo-700">View details →</span>
      </button>
    );
  }
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{contents}</article>;
};

const EmptyChart = ({ message }) => (
  <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
    {message}
  </div>
);

const AdminRevenue = () => {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [currency, setCurrency] = useState("NGN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshId, setRefreshId] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    request(`/admin/revenue?range=${range}`)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load revenue analytics.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [range, refreshId]);

  const platformChart = useMemo(() => (data?.platform?.trend || [])
    .filter((point) => point.currency === currency)
    .map((point) => ({
      ...point,
      label: new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    })), [data, currency]);

    const activeDetails = data?.platform?.activeSubscriptionDetails || [];
    const capturedPayments = data?.platform?.capturedPayments || data?.platform?.latestPayments || [];
    const getMetricDetails = () => {
      if (selectedMetric === "active") return {
        title: "Active paid subscriptions",
        description: "Current Pro subscriptions marked active that have no expiry date or have not expired. This count is independent of the selected receipt period.",
        subscriptions: activeDetails
      };
      if (selectedMetric === "unknown") return {
        title: "Active plans with unknown currency",
        description: "These legacy subscription records have an active paid plan, but no verified currency was saved. They are deliberately excluded from NGN and USD run-rate totals.",
        subscriptions: data.platform.unrecordedCurrencyDetails || []
      };
      if (selectedMetric.startsWith("runrate-")) {
        const metricCurrency = selectedMetric.endsWith("USD") ? "USD" : "NGN";
        return {
          title: `Current monthly run-rate · ${metricCurrency}`,
          description: `Estimated monthly value from current active plans with a recorded ${metricCurrency} currency. Annual plan amounts are divided by 12; this is a run-rate estimate, not cash received in the selected period.`,
          subscriptions: activeDetails.filter((item) => item.currency === metricCurrency),
          currency: metricCurrency
        };
      }
      if (selectedMetric.startsWith("captured-")) {
        const metricCurrency = selectedMetric.endsWith("USD") ? "USD" : "NGN";
        return {
          title: `Subscription cash received · ${metricCurrency}`,
          description: `Verified subscription payment receipts captured during ${RANGE_OPTIONS.find((option) => option.value === range)?.label.toLowerCase()}. This is historical cash, not the value of all currently active subscriptions.`,
          payments: capturedPayments.filter((payment) => payment.currency === metricCurrency),
          currency: metricCurrency,
          truncated: data.platform.capturedPaymentsTruncated
        };
      }
      return null;
    };
    const metricDetails = selectedMetric ? getMetricDetails() : null;

  if (loading && !data) {
    return (
      <section className="page-stack">
        <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading global revenue…
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-7 text-white shadow-lg md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-200">Super Admin · Finance</span>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Revenue overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-indigo-100">
            Tenant-generated sales and Marthington subscription income are reported separately.
          </p>
        </div>
        <label className="text-xs font-semibold text-indigo-100">
          Reporting period
          <select
            aria-label="Revenue reporting period"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="mt-1 block min-w-40 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none [&>option]:text-slate-900"
          >
            {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => setRefreshId((current) => current + 1)} className="font-bold underline">Retry</button>
        </div>
      )}

      {data && (
        <>
          {loading && <p className="text-xs font-medium text-slate-500">Refreshing selected period…</p>}
          <section aria-labelledby="tenant-revenue-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Tenant businesses</p>
                <h2 id="tenant-revenue-heading" className="mt-1 text-xl font-bold text-slate-900">Sales generated across tenants</h2>
              </div>
              <p className="text-xs text-slate-500">Business sales are not Marthington platform income.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Recorded sales"
                value={money(data.tenantSales.total)}
                detail={changeLabel(data.tenantSales.changePercent)}
              />
              <StatCard
                label="Sales transactions"
                value={Number(data.tenantSales.saleCount || 0).toLocaleString()}
                detail={RANGE_OPTIONS.find((option) => option.value === range)?.label}
                accent="sky"
              />
              <StatCard
                label="Active paid subscriptions"
                value={Number(data.platform.activeSubscriptions || 0).toLocaleString()}
                detail="Current paid plans; includes plans without an expiry date"
                accent="emerald"
                onClick={() => setSelectedMetric("active")}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">Tenant sales trend</h3>
                <p className="mt-1 text-xs text-slate-500">Recorded sale value by day (NGN).</p>
                {data.tenantSales.trend.length ? (
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.tenantSales.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tenantSalesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.24} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="_id" tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} minTickGap={28} />
                        <YAxis tickFormatter={(value) => money(value, "NGN", true)} width={76} />
                        <Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString()} formatter={(value) => [money(value), "Tenant sales"]} />
                        <Area type="monotone" dataKey="amount" stroke="#4f46e5" fill="url(#tenantSalesFill)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyChart message="No tenant sales were recorded in this period." />}
              </article>
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-bold text-slate-900">Top tenant businesses</h3>
                  <p className="mt-1 text-xs text-slate-500">By recorded sales for this period.</p>
                </div>
                {data.tenantSales.topBusinesses.length ? (
                  <div className="divide-y divide-slate-100">
                    {data.tenantSales.topBusinesses.map((business, index) => (
                      <div key={business.businessId || index} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{index + 1}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{business.businessName}</p>
                            <p className="text-xs text-slate-500">{business.saleCount} sales</p>
                          </div>
                        </div>
                        <strong className="shrink-0 text-sm text-slate-900">{money(business.amount)}</strong>
                      </div>
                    ))}
                  </div>
                ) : <div className="p-8 text-center text-sm text-slate-500">No tenant sales to rank yet.</div>}
              </article>
            </div>
          </section>

          <section aria-labelledby="platform-revenue-heading" className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Marthington platform</p>
              <h2 id="platform-revenue-heading" className="mt-1 text-xl font-bold text-slate-900">Subscription receipts and run-rate</h2>
              <p className="mt-1 text-xs text-slate-500">Amounts are kept in their payment currency; NGN and USD are not combined.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Subscription cash received · NGN"
                value={money(data.platform.captured.NGN.gross)}
                detail={`${data.platform.captured.NGN.count} receipts · ${platformChangeLabel(data.platform.captured.NGN.gross, data.platform.previousCaptured.NGN.gross)} · net ${money(data.platform.captured.NGN.net)}`}
                accent="emerald"
                onClick={() => setSelectedMetric("captured-NGN")}
              />
              <StatCard
                label="Subscription cash received · USD"
                value={money(data.platform.captured.USD.gross, "USD")}
                detail={`${data.platform.captured.USD.count} receipts · ${platformChangeLabel(data.platform.captured.USD.gross, data.platform.previousCaptured.USD.gross)} · net ${money(data.platform.captured.USD.net, "USD")}`}
                accent="teal"
                onClick={() => setSelectedMetric("captured-USD")}
              />
              <StatCard
                label="Current monthly run-rate · NGN"
                value={money(data.platform.monthlyRunRate.NGN)}
                detail="Annual plans are divided by 12"
                accent="blue"
                onClick={() => setSelectedMetric("runrate-NGN")}
              />
              <StatCard
                label="Current monthly run-rate · USD"
                value={money(data.platform.monthlyRunRate.USD, "USD")}
                detail="Estimate from active paid plans"
                accent="violet"
                onClick={() => setSelectedMetric("runrate-USD")}
              />
              <StatCard
                label="Active plans with unknown currency"
                value={Number(data.platform.unrecordedCurrencySubscriptions || 0).toLocaleString()}
                detail="Legacy subscription records awaiting a verified renewal"
                accent="teal"
                onClick={() => setSelectedMetric("unknown")}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Verified subscription receipts</h3>
                    <p className="mt-1 text-xs text-slate-500">Gross receipts and affiliate commissions by currency.</p>
                  </div>
                  <label className="text-xs font-semibold text-slate-600">
                    Currency
                    <select aria-label="Platform chart currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                </div>
                {platformChart.length ? (
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={platformChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="platformIncomeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" minTickGap={28} />
                        <YAxis tickFormatter={(value) => money(value, currency, true)} width={76} />
                        <Tooltip formatter={(value, name) => [money(value, currency), name === "gross" ? "Gross receipts" : "Affiliate commissions"]} />
                        <Area type="monotone" dataKey="gross" name="gross" stroke="#059669" fill="url(#platformIncomeFill)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="commissions" name="commissions" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyChart message={`No verified ${currency} subscription receipts are recorded for this period.`} />}
              </article>
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-bold text-slate-900">Latest platform receipts</h3>
                  <p className="mt-1 text-xs text-slate-500">Successful subscription payments recorded for this period.</p>
                </div>
                {data.platform.latestPayments.length ? (
                  <div className="divide-y divide-slate-100">
                    {data.platform.latestPayments.map((payment) => (
                      <div key={payment.reference} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{payment.businessName || "Tenant"}</p>
                          <p className="text-xs capitalize text-slate-500">{payment.gateway} · {payment.billingCycle} · {new Date(payment.paidAt).toLocaleDateString()}</p>
                        </div>
                        <strong className="shrink-0 text-sm text-slate-900">{money(payment.amount, payment.currency)}</strong>
                      </div>
                    ))}
                  </div>
                ) : <div className="p-8 text-center text-sm text-slate-500">No captured subscription receipts in this period.</div>}
              </article>
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              {data.platform.historyNotice}
            </p>
          </section>
        </>
      )}
      {metricDetails && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Close revenue details"
            onClick={() => setSelectedMetric("")}
            className="absolute inset-0 cursor-default"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="revenue-detail-title"
            className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Revenue details</p>
                <h2 id="revenue-detail-title" className="mt-1 text-xl font-extrabold text-slate-900">{metricDetails.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-600">{metricDetails.description}</p>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setSelectedMetric("")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-lg text-slate-600 hover:bg-slate-50"
              >
                ×
              </button>
            </header>
            <div className="max-h-[calc(90vh-120px)] overflow-auto p-5 sm:p-7">
              {metricDetails.subscriptions && (
                metricDetails.subscriptions.length ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Business / owner</th>
                          <th className="px-4 py-3">Billing</th>
                          <th className="px-4 py-3">Subscription value</th>
                          <th className="px-4 py-3">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metricDetails.subscriptions.map((subscription) => {
                          const monthlyAmount = subscription.billingCycle === "yearly"
                            ? subscription.amount / 12
                            : subscription.amount;
                          return (
                            <tr key={subscription.businessId} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <Link to={`/admin/business/${subscription.businessId}`} onClick={() => setSelectedMetric("")} className="font-bold text-indigo-700 hover:underline">{subscription.businessName}</Link>
                                <p className="mt-1 text-xs text-slate-500">{subscription.ownerName || "Business owner"}{subscription.ownerEmail ? ` · ${subscription.ownerEmail}` : ""}</p>
                                {subscription.ownerPhone && <p className="mt-1 text-xs text-slate-500">{subscription.ownerPhone}</p>}
                              </td>
                              <td className="px-4 py-3 capitalize text-slate-700">{subscription.tier || "Pro"} · {subscription.billingCycle || "cycle not recorded"}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {subscription.currency
                                  ? `${money(subscription.amount, subscription.currency)}${metricDetails.currency ? ` · ${money(monthlyAmount, subscription.currency)}/month` : ""}`
                                  : `${Number(subscription.amount || 0).toLocaleString()} · currency not recorded`}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : "No expiry date"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No subscriptions match this detail.</p>
                )
              )}
              {metricDetails.payments && (
                <>
                  {metricDetails.truncated && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Showing up to 500 detailed receipts. Summary totals include all receipts in the period.</p>}
                  {metricDetails.payments.length ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Business</th>
                            <th className="px-4 py-3">Receipt date</th>
                            <th className="px-4 py-3">Gateway / cycle</th>
                            <th className="px-4 py-3">Gross</th>
                            <th className="px-4 py-3">Affiliate commission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {metricDetails.payments.map((payment) => (
                            <tr key={payment.reference} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-800">{payment.businessName || "Tenant"}</td>
                              <td className="px-4 py-3 text-slate-600">{new Date(payment.paidAt).toLocaleString()}</td>
                              <td className="px-4 py-3 capitalize text-slate-600">{payment.gateway} · {payment.billingCycle}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{money(payment.amount, payment.currency)}</td>
                              <td className="px-4 py-3 text-slate-700">{money(payment.affiliateCommission, payment.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No verified receipts in this currency and reporting period.</p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default AdminRevenue;
