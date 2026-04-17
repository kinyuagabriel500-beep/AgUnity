import { useEffect, useState } from "react";
import KpiCard from "../components/KpiCard";
import { getJson } from "../api/client";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [oversight, setOversight] = useState({ contracts: [], enterprises: [], batches: [] });
  const [billingOverview, setBillingOverview] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [data, overview] = await Promise.all([
          getJson("/admin/analytics"),
          getJson("/admin/enterprise-oversight")
        ]);
        const billing = await getJson("/billing/admin-overview").catch(() => null);
        setAnalytics(data);
        setOversight(overview || { contracts: [], enterprises: [], batches: [] });
        setBillingOverview(billing);
        setError("");
      } catch (_error) {
        setError("Failed to load admin analytics.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>
      <div className="grid-3">
        <KpiCard
          title="Active Farmers"
          value={loading ? "Loading..." : String(analytics?.users?.activeFarmers || 0)}
          hint={`Total users: ${analytics?.users?.total || 0}`}
        />
        <KpiCard
          title="Platform GMV"
          value={loading ? "Loading..." : `KES ${(analytics?.finance?.platformGmvKes || 0).toLocaleString()}`}
          hint="Marketplace sales"
        />
        <KpiCard
          title="System Health"
          value={loading ? "Loading..." : (analytics?.system?.status || "unknown")}
          hint={`API: ${analytics?.system?.api || "unknown"}`}
        />
        <KpiCard
          title="Enterprises"
          value={loading ? "Loading..." : String(analytics?.enterprise?.total || 0)}
          hint={`Contracts: ${analytics?.contracts?.total || 0}`}
        />
        <KpiCard
          title="Batches Tracked"
          value={loading ? "Loading..." : String(Object.values(analytics?.supplyChain?.byStage || {}).reduce((sum, v) => sum + Number(v || 0), 0))}
          hint="Cross-role supply chain"
        />
        <KpiCard
          title="Role Coverage"
          value={loading ? "Loading..." : String(Object.keys(analytics?.roles || {}).length)}
          hint="Active user roles"
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section>
        <h3>Marketplace Analytics</h3>
        <ul className="simple-list">
          <li>Active listings: {analytics?.marketplace?.activeListings || 0}</li>
          <li>Open orders: {analytics?.marketplace?.openOrders || 0}</li>
          <li>Recent transactions (7d): {analytics?.marketplace?.recentTransactions || 0}</li>
        </ul>
      </section>

      <section>
        <h3>Carbon & Farms</h3>
        <ul className="simple-list">
          <li>Total farms: {analytics?.farms?.total || 0}</li>
          <li>Certificates issued: {analytics?.carbon?.certificatesIssued || 0}</li>
          <li>Total carbon earnings: KES {(analytics?.carbon?.totalKesIssued || 0).toLocaleString()}</li>
        </ul>
      </section>

      <section>
        <h3>Enterprise & Contract Oversight</h3>
        <ul className="simple-list">
          <li>Enterprise statuses: {Object.entries(analytics?.enterprise?.byStatus || {}).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}</li>
          <li>Contract statuses: {Object.entries(analytics?.contracts?.byStatus || {}).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}</li>
          <li>Supply chain stages: {Object.entries(analytics?.supplyChain?.byStage || {}).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}</li>
          <li>User roles: {Object.entries(analytics?.roles || {}).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}</li>
        </ul>
      </section>

      <section>
        <h3>Latest Enterprise Contracts</h3>
        <table className="table">
          <thead>
            <tr><th>Enterprise</th><th>Farm</th><th>Buyer</th><th>Status</th><th>Value</th></tr>
          </thead>
          <tbody>
            {(oversight.contracts || []).map((item) => (
              <tr key={item.id}>
                <td>{item.Enterprise?.name || "Enterprise"}</td>
                <td>{item.Enterprise?.Farm?.name || "Farm"}</td>
                <td>{item.buyerName}</td>
                <td>{item.status}</td>
                <td>KES {(Number(item.quantity || 0) * Number(item.unitPriceKes || 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Latest Traceability Batches</h3>
        <table className="table">
          <thead>
            <tr><th>Batch</th><th>Crop</th><th>Stage</th><th>Settlement</th><th>Ledger</th></tr>
          </thead>
          <tbody>
            {(oversight.batches || []).map((item) => (
              <tr key={item.batchCode}>
                <td>{item.batchCode}</td>
                <td>{item.crop}</td>
                <td>{item.currentStage}</td>
                <td>{item.settlementStatus}</td>
                <td>{item.verificationStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Monetization Engine</h3>
        <ul className="simple-list">
          <li>Monthly Revenue (KES): {(billingOverview?.metrics?.monthlyRevenueKes || 0).toLocaleString()}</li>
          <li>Paid transactions: {billingOverview?.metrics?.totalPaidTransactions || 0}</li>
          <li>Active subscriptions: {billingOverview?.metrics?.activeSubscriptions || 0}</li>
          <li>Open problem tickets: {billingOverview?.metrics?.openTickets || 0}</li>
          <li>Resolved problem tickets: {billingOverview?.metrics?.resolvedTickets || 0}</li>
        </ul>
        <table className="table">
          <thead>
            <tr><th>Plan</th><th>Price (KES)</th><th>Active Subs</th></tr>
          </thead>
          <tbody>
            {(billingOverview?.planMix || []).map((row) => (
              <tr key={row.planCode}>
                <td>{row.planName}</td>
                <td>{Number(row.priceKes || 0).toLocaleString()}</td>
                <td>{row.activeSubscriptions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
