import { useEffect, useState } from "react";
import { getPayoutRequests, approvePayout, rejectPayout } from "../api/admin.js";

const AdminPayouts = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPayoutRequests("status=pending&limit=100");
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Affiliate Payout Requests</h1>

        {loading ? (
          <div>Loading...</div>
        ) : requests.length === 0 ? (
          <div>No pending requests.</div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r._id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{r.affiliate?.name || r.affiliateCode}</div>
                    <div className="text-sm text-slate-500">Amount: ₦{r.amountRequested}</div>
                    <div className="text-sm text-slate-500">Requested: {new Date(r.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="rounded px-3 py-2 bg-emerald-600 text-white"
                      onClick={async () => {
                        await approvePayout(r._id, { note: "Manual payout approved" });
                        load();
                      }}
                    >Approve</button>

                    <button
                      className="rounded px-3 py-2 bg-rose-600 text-white"
                      onClick={async () => {
                        await rejectPayout(r._id, { note: "Rejected by admin" });
                        load();
                      }}
                    >Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayouts;
