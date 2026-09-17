import { useEffect, useMemo, useState } from "react";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const paymentStatusStyles = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const VerifyPayment = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const canReview = Boolean(
    user?.role === "owner" ||
    user?.role === "super_admin" ||
    user?.permissions?.canManagePayments
  );

  const summary = useMemo(() => ({
    total: sales.length,
    pending: sales.filter((sale) => sale.paymentStatus === "pending").length,
    verified: sales.filter((sale) => sale.paymentStatus === "verified").length,
    rejected: sales.filter((sale) => sale.paymentStatus === "rejected").length,
  }), [sales]);

  const loadPendingSales = async () => {
    try {
      setLoading(true);
      const data = await request("/sales?paymentStatus=pending&limit=50");
      const nextSales = Array.isArray(data) ? data : data?.sales || [];
      setSales(nextSales);
    } catch (err) {
      setMessage(err.message || "Unable to load pending payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canReview) {
      loadPendingSales();
    }
  }, [canReview]);

  const handleDecision = async (saleId, approved, note = "") => {
    if (!saleId) return;

    try {
      setProcessingId(saleId);
      const sale = sales.find((item) => item._id === saleId);
      await request(`/sales/${saleId}/verify-payment`, {
        method: "PATCH",
        body: JSON.stringify({
          approved: String(approved),
          note,
          paymentReference: sale?.paymentReference || "",
          paymentProof: sale?.paymentProof || "",
        }),
      });

      setMessage(approved ? "Payment approved successfully." : "Payment rejected.");
      await loadPendingSales();
    } catch (err) {
      setMessage(err.message || "Unable to update payment status.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!canReview) {
    return (
      <section className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600">Access restricted</p>
          <h1 className="mt-4 text-2xl font-black text-slate-900">Payment review access required</h1>
          <p className="mt-3 text-sm text-slate-600">Only owners, super admins, or staff with payment permissions can review manual payment proofs.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-600">Manual approvals</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Payment verification queue</h1>
            </div>
            <button
              type="button"
              onClick={loadPendingSales}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Refresh queue
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Pending</p>
              <p className="mt-2 text-2xl font-black text-amber-700">{summary.pending}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Verified</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{summary.verified}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700">Rejected</p>
              <p className="mt-2 text-2xl font-black text-rose-700">{summary.rejected}</p>
            </div>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.05)] md:p-5">
          {loading ? (
            <div className="p-10 text-center text-sm font-medium text-slate-500">Loading pending orders...</div>
          ) : sales.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-black text-slate-900">No payment proofs are waiting review.</p>
              <p className="mt-2 text-sm text-slate-500">Orders that are paid directly to a business account will appear here for approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div key={sale._id} className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">#{sale.receiptId || "SALE"}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${paymentStatusStyles[sale.paymentStatus || "pending"]}`}>
                          {sale.paymentStatus || "pending"}
                        </span>
                      </div>

                      <div>
                        <p className="text-xl font-black text-slate-900">{sale.customerName || "Walk-in customer"}</p>
                        <p className="text-sm text-slate-500">{new Date(sale.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Amount</p>
                          <p className="mt-2 text-lg font-black text-slate-900">{Number(sale.totalAmount || 0).toLocaleString("en-NG", { style: "currency", currency: "NGN" })}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Method</p>
                          <p className="mt-2 text-lg font-black capitalize text-slate-900">{(sale.paymentMethod || "bank_transfer").replace("_", " ")}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Payment reference</p>
                        <p className="mt-2 font-mono text-sm text-slate-700">{sale.paymentReference || "No reference provided"}</p>
                      </div>

                      {sale.paymentProof ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Proof</p>
                          <p className="mt-2 text-sm text-slate-700">{sale.paymentProof}</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                          No uploaded proof attached yet. Confirm payment by reference or customer note.
                        </div>
                      )}

                      {sale.notes && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Additional note</p>
                          <p className="mt-2 text-sm text-slate-700">{sale.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-[220px] flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-4 lg:ml-4">
                      <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Decision</label>
                      <textarea
                        rows={3}
                        placeholder="Approval note or rejection reason..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                        id={`note-${sale._id}`}
                        defaultValue=""
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={processingId === sale._id}
                          onClick={async () => {
                            const note = document.getElementById(`note-${sale._id}`)?.value || "";
                            await handleDecision(sale._id, true, note);
                          }}
                          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {processingId === sale._id ? "Approving..." : "Approve"}
                        </button>

                        <button
                          type="button"
                          disabled={processingId === sale._id}
                          onClick={async () => {
                            const note = document.getElementById(`note-${sale._id}`)?.value || "";
                            await handleDecision(sale._id, false, note);
                          }}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 disabled:opacity-60"
                        >
                          {processingId === sale._id ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default VerifyPayment;