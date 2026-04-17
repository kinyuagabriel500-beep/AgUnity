import { useMemo, useState } from "react";
import { getJson, postJson } from "../api/client";
import QrBatchScanner from "./QrBatchScanner";

export default function RoleWorkflowPanel({ title, subtitle, allowedEvents, defaultEvent, enableQrScan = false }) {
  const [batchCode, setBatchCode] = useState("");
  const [journey, setJourney] = useState(null);
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [journeyError, setJourneyError] = useState("");
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [form, setForm] = useState({
    batchCode: "",
    eventType: defaultEvent,
    note: "",
    settlementReference: "",
    paymentReference: "",
    settlementPriceKes: "",
    buyerName: ""
  });

  const eventOptions = useMemo(
    () =>
      allowedEvents.map((value) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1)
      })),
    [allowedEvents]
  );

  const verifyBatch = async (event) => {
    event.preventDefault();
    if (!batchCode.trim()) return;
    setLoadingJourney(true);
    setJourneyError("");
    setWorkflowMessage("");
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

  const onDetectedCode = (code) => {
    setBatchCode(code);
    setForm((p) => ({ ...p, batchCode: code }));
    setWorkflowMessage(`QR detected: ${code}`);
  };

  const submitWorkflow = async (event) => {
    event.preventDefault();
    if (!form.batchCode.trim()) return;
    setWorkflowBusy(true);
    setWorkflowMessage("");
    setJourneyError("");
    try {
      const payload = {
        eventType: form.eventType,
        note: form.note || undefined,
        settlementReference: form.settlementReference || undefined,
        paymentReference: form.paymentReference || undefined,
        settlementPriceKes: form.settlementPriceKes ? Number(form.settlementPriceKes) : undefined,
        buyerName: form.buyerName || undefined
      };
      await postJson(`/traceability/batches/${form.batchCode.trim()}/workflow`, payload);
      const refreshedJourney = await getJson(`/traceability/journey/${form.batchCode.trim()}`);
      setJourney(refreshedJourney);
      setWorkflowMessage(`Recorded ${form.eventType} for ${form.batchCode.trim()}.`);
    } catch (_error) {
      setWorkflowMessage("Unable to record workflow step. Check role, order, and input fields.");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const requiresSettlementFields = form.eventType === "settled";

  return (
    <div className="dashboard role-board">
      <h2>{title}</h2>
      <p>{subtitle}</p>

      <section className="journey-card">
        <h3>Verify Batch Journey</h3>
        {enableQrScan ? <QrBatchScanner onDetected={onDetectedCode} /> : null}
        <form className="auth-form" onSubmit={verifyBatch}>
          <input
            placeholder="Batch code"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
          />
          <button type="submit" disabled={loadingJourney}>
            {loadingJourney ? "Loading..." : "Load journey"}
          </button>
        </form>
        {journeyError ? <p className="error">{journeyError}</p> : null}

        {journey ? (
          <div className="journey-result">
            <div className="ledger-grid">
              <div><strong>Batch:</strong> {journey.batchCode}</div>
              <div><strong>Current stage:</strong> {journey.currentStage}</div>
              <div><strong>Settlement:</strong> {journey.settlementStatus}</div>
              <div><strong>Next stage:</strong> {journey.workflow?.nextAllowedStage || "None"}</div>
              <div><strong>Farm:</strong> {journey.farm?.name || "Unknown"}</div>
              <div><strong>Payment:</strong> {journey.commerce?.latestSale?.paymentStatus || "pending"}</div>
            </div>
            <ul className="timeline-list">
              {(journey.timeline || []).map((item, idx) => (
                <li key={`${item.stage}-${item.createdAt || idx}`}>
                  <strong>{item.stage}:</strong> {item.label} <span className={`severity-badge severity-${item.status === "anchored" ? "low" : "medium"}`}>{item.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="journey-card">
        <h3>Record Allowed Workflow Step</h3>
        <form className="auth-form workflow-form" onSubmit={submitWorkflow}>
          <input
            placeholder="Batch code"
            value={form.batchCode}
            onChange={(e) => setForm((p) => ({ ...p, batchCode: e.target.value }))}
          />
          <select
            value={form.eventType}
            onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}
          >
            {eventOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input
            placeholder="Note"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          />

          {requiresSettlementFields ? (
            <>
              <input
                placeholder="Settlement reference"
                value={form.settlementReference}
                onChange={(e) => setForm((p) => ({ ...p, settlementReference: e.target.value }))}
              />
              <input
                placeholder="Payment reference"
                value={form.paymentReference}
                onChange={(e) => setForm((p) => ({ ...p, paymentReference: e.target.value }))}
              />
              <input
                placeholder="Settlement price KES/kg"
                value={form.settlementPriceKes}
                onChange={(e) => setForm((p) => ({ ...p, settlementPriceKes: e.target.value }))}
              />
              <input
                placeholder="Buyer name"
                value={form.buyerName}
                onChange={(e) => setForm((p) => ({ ...p, buyerName: e.target.value }))}
              />
            </>
          ) : null}

          <button type="submit" disabled={workflowBusy}>
            {workflowBusy ? "Submitting..." : "Submit step"}
          </button>
        </form>
        {workflowMessage ? <p>{workflowMessage}</p> : null}
      </section>
    </div>
  );
}
