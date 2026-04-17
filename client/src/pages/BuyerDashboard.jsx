import { useEffect, useState } from "react";
import KpiCard from "../components/KpiCard";
import UniversalEnterprisePanel from "../components/UniversalEnterprisePanel";
import ContractActionPanel from "../components/ContractActionPanel";
import { getJson, postJson } from "../api/client";

export default function BuyerDashboard() {
  const [listings, setListings] = useState([]);
  const [dashboard, setDashboard] = useState({ average: 0, openOrders: 0, fastSell: 0 });
  const [batchCode, setBatchCode] = useState("");
  const [journey, setJourney] = useState(null);
  const [journeyError, setJourneyError] = useState("");
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [workflow, setWorkflow] = useState({
    batchCode: "",
    eventType: "handoff",
    note: "",
    settlementReference: "",
    paymentReference: "",
    settlementPriceKes: "",
    buyerName: ""
  });
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [listingRes, priceRes] = await Promise.all([
          getJson("/marketplace/listings"),
          getJson("/marketplace/price-dashboard")
        ]);
        const items = listingRes.items || [];
        const avg =
          (priceRes.listingMarket || []).reduce((sum, row) => sum + Number(row.avgListingPriceKes || 0), 0) /
          Math.max((priceRes.listingMarket || []).length, 1);

        setListings(items);
        setDashboard({
          average: Math.round(avg),
          openOrders: (priceRes.salesMarket || []).length,
          fastSell: items.length
        });
      } catch (_error) {
        setListings([]);
      }
    };
    load();
  }, []);

  const placeOrder = async (listing) => {
    await postJson("/marketplace/orders", {
      listingId: listing.id,
      quantityKg: 1,
      offeredPricePerKgKes: Number(listing.pricePerKgKes)
    });
    alert("Order placed.");
  };

  const verifyBatch = async (event) => {
    event.preventDefault();
    if (!batchCode.trim()) return;
    setLoadingJourney(true);
    setJourneyError("");
    try {
      const data = await getJson(`/traceability/journey/${batchCode.trim()}`);
      setJourney(data);
    } catch (_error) {
      setJourney(null);
      setJourneyError("Traceability record not found for that batch code.");
    } finally {
      setLoadingJourney(false);
    }
  };

  const submitWorkflow = async (event) => {
    event.preventDefault();
    if (!workflow.batchCode.trim()) return;
    setWorkflowBusy(true);
    setWorkflowMessage("");
    try {
      const response = await postJson(`/traceability/batches/${workflow.batchCode.trim()}/workflow`, {
        eventType: workflow.eventType,
        note: workflow.note || undefined,
        settlementReference: workflow.settlementReference || undefined,
        paymentReference: workflow.paymentReference || undefined,
        settlementPriceKes: workflow.settlementPriceKes ? Number(workflow.settlementPriceKes) : undefined,
        buyerName: workflow.buyerName || undefined
      });
      setWorkflowMessage(`Recorded ${response.event.eventType} for ${response.batch.batchCode}.`);
      const refreshedJourney = await getJson(`/traceability/journey/${workflow.batchCode.trim()}`);
      setJourney(refreshedJourney);
    } catch (_error) {
      setWorkflowMessage("Unable to record workflow step. Check role and batch order.");
    } finally {
      setWorkflowBusy(false);
    }
  };

  return (
    <div className="dashboard">
      <h2>Buyer Dashboard</h2>
      <UniversalEnterprisePanel
        title="Buyer Universal Enterprise Dashboard"
        subtitle="Marketplace buying, traceability verification, and enterprise contracting in one view."
      />
      <div className="grid-3">
        <KpiCard title="Open Orders" value={String(dashboard.openOrders)} hint="Awaiting confirmation" />
        <KpiCard title="Average Price" value={`KES ${dashboard.average}/kg`} hint="Across active crops" />
        <KpiCard title="Fast Sell Lots" value={String(dashboard.fastSell)} hint="Ready for immediate purchase" />
      </div>

      <section>
        <h3>Marketplace Listings</h3>
        <table className="table">
          <thead><tr><th>Crop</th><th>Price</th><th>Available</th><th>Action</th></tr></thead>
          <tbody>
            {listings.map((item) => (
              <tr key={item.id}>
                <td>{item.crop}</td>
                <td>KES {Number(item.pricePerKgKes).toLocaleString()}/kg</td>
                <td>{Number(item.quantityKg).toLocaleString()}kg</td>
                <td><button onClick={() => placeOrder(item)}>Place Order</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ContractActionPanel role="buyer" />

      <section className="journey-card">
        <h3>Supply Chain Verification</h3>
        <p>Scan or enter a batch code to verify origin, movement, payment status, and ledger proof.</p>
        <form className="auth-form" onSubmit={verifyBatch}>
          <input
            placeholder="Batch code"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
          />
          <button type="submit" disabled={loadingJourney}>
            {loadingJourney ? "Verifying..." : "Verify batch"}
          </button>
        </form>
        {journeyError ? <p className="error">{journeyError}</p> : null}
        {journey ? (
          <div className="journey-result">
            <div className="ledger-grid">
              <div><strong>Crop:</strong> {journey.crop}</div>
              <div><strong>Stage:</strong> {journey.supplyChainStage}</div>
              <div><strong>Farm:</strong> {journey.farm?.name || "Unknown"}</div>
              <div><strong>Ledger:</strong> {journey.ledger.verificationStatus}</div>
              <div><strong>Payment:</strong> {journey.commerce.latestSale?.paymentStatus || "pending"}</div>
              <div><strong>Price:</strong> KES {Number(journey.commerce.latestSale?.unitPriceKes || journey.commerce.latestListing?.pricePerKgKes || 0).toLocaleString()}/kg</div>
            </div>
            <ul className="timeline-list">
              {journey.timeline.map((item) => (
                <li key={`${item.stage}-${item.label}`}>
                  <strong>{item.stage}:</strong> {item.label} <span className={`severity-badge severity-${item.status === "recorded" || item.status === "visible" || item.status === "anchored" || item.status === "paid" ? "low" : "medium"}`}>{item.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form className="auth-form workflow-form" onSubmit={submitWorkflow}>
          <h4>Record workflow step</h4>
          <input
            placeholder="Batch code"
            value={workflow.batchCode}
            onChange={(e) => setWorkflow((p) => ({ ...p, batchCode: e.target.value }))}
          />
          <select
            value={workflow.eventType}
            onChange={(e) => setWorkflow((p) => ({ ...p, eventType: e.target.value }))}
          >
            <option value="handoff">Handoff</option>
            <option value="received">Received</option>
            <option value="listed">Listed</option>
            <option value="verified">Verified</option>
            <option value="settled">Settled</option>
            <option value="disputed">Disputed</option>
          </select>
          <input
            placeholder="Note"
            value={workflow.note}
            onChange={(e) => setWorkflow((p) => ({ ...p, note: e.target.value }))}
          />
          <input
            placeholder="Settlement reference"
            value={workflow.settlementReference}
            onChange={(e) => setWorkflow((p) => ({ ...p, settlementReference: e.target.value }))}
          />
          <input
            placeholder="Payment reference"
            value={workflow.paymentReference}
            onChange={(e) => setWorkflow((p) => ({ ...p, paymentReference: e.target.value }))}
          />
          <input
            placeholder="Settlement price KES/kg"
            value={workflow.settlementPriceKes}
            onChange={(e) => setWorkflow((p) => ({ ...p, settlementPriceKes: e.target.value }))}
          />
          <input
            placeholder="Buyer name"
            value={workflow.buyerName}
            onChange={(e) => setWorkflow((p) => ({ ...p, buyerName: e.target.value }))}
          />
          <button type="submit" disabled={workflowBusy}>
            {workflowBusy ? "Recording..." : "Submit workflow step"}
          </button>
        </form>
        {workflowMessage ? <p>{workflowMessage}</p> : null}
      </section>
    </div>
  );
}
