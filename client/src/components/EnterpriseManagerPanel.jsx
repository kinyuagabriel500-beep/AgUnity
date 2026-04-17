import { useEffect, useMemo, useState } from "react";
import { getJson, postJson } from "../api/client";

export default function EnterpriseManagerPanel({ farmId }) {
  const [templates, setTemplates] = useState([]);
  const [enterprises, setEnterprises] = useState([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState("");
  const [calendar, setCalendar] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [aiInsights, setAiInsights] = useState({ yield: null, costs: null, actions: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resourceForm, setResourceForm] = useState({ resourceType: "feed", quantity: "", cost: "" });
  const [outputForm, setOutputForm] = useState({ outputType: "produce", quantity: "", revenue: "" });
  const [contractForm, setContractForm] = useState({
    buyerName: "",
    outputType: "produce",
    quantity: "",
    unitPriceKes: "",
    deliveryDate: new Date().toISOString().slice(0, 10)
  });
  const [newEnterprise, setNewEnterprise] = useState({
    type: "livestock",
    subtype: "dairy",
    name: "",
    startDate: new Date().toISOString().slice(0, 10),
    scaleUnits: "1",
    scaleUnitLabel: "units"
  });

  const subtypeOptions = useMemo(
    () => templates.filter((item) => item.type === newEnterprise.type).map((item) => item.subtype),
    [templates, newEnterprise.type]
  );

  const refreshEnterprises = async () => {
    if (!farmId) return;
    const list = await getJson(`/enterprise/list?farmId=${farmId}`);
    const items = list.items || [];
    setEnterprises(items);
    if (!selectedEnterpriseId && items.length) {
      setSelectedEnterpriseId(items[0].id);
    }
  };

  const loadTemplates = async () => {
    const data = await getJson("/enterprise/templates");
    setTemplates(data.items || []);
  };

  const loadEnterpriseDetail = async (enterpriseId) => {
    if (!enterpriseId) return;
    const [calendarRes, financialRes, yieldRes, costRes, actionRes] = await Promise.all([
      getJson(`/enterprise/${enterpriseId}/calendar`),
      getJson(`/enterprise/${enterpriseId}/financials`),
      postJson(`/enterprise/${enterpriseId}/predict-yield`, {}),
      postJson(`/enterprise/${enterpriseId}/optimize-costs`, {}),
      postJson(`/enterprise/${enterpriseId}/recommend-actions`, {}),
    ]);

    setCalendar(calendarRes.items || []);
    setFinancials(financialRes);
    setAiInsights({
      yield: yieldRes,
      costs: costRes,
      actions: actionRes,
    });
  };

  useEffect(() => {
    if (!farmId) return;
    (async () => {
      try {
        setError("");
        await Promise.all([loadTemplates(), refreshEnterprises()]);
      } catch (_error) {
        setError("Unable to load enterprise data.");
      }
    })();
  }, [farmId]);

  useEffect(() => {
    if (!selectedEnterpriseId) return;
    (async () => {
      try {
        setError("");
        await loadEnterpriseDetail(selectedEnterpriseId);
      } catch (_error) {
        setError("Unable to load selected enterprise details.");
      }
    })();
  }, [selectedEnterpriseId]);

  useEffect(() => {
    if (!subtypeOptions.length) return;
    if (!subtypeOptions.includes(newEnterprise.subtype)) {
      setNewEnterprise((prev) => ({ ...prev, subtype: subtypeOptions[0] }));
    }
  }, [subtypeOptions, newEnterprise.subtype]);

  const addEnterprise = async (event) => {
    event.preventDefault();
    if (!farmId) return;
    setBusy(true);
    setError("");
    try {
      await postJson("/enterprise/create", {
        farmId,
        type: newEnterprise.type,
        subtype: newEnterprise.subtype,
        name: newEnterprise.name || undefined,
        startDate: newEnterprise.startDate,
        scaleUnits: Number(newEnterprise.scaleUnits || 1),
        scaleUnitLabel: newEnterprise.scaleUnitLabel || "units"
      });
      await refreshEnterprises();
    } catch (_error) {
      setError("Unable to create enterprise.");
    } finally {
      setBusy(false);
    }
  };

  const logResource = async (event) => {
    event.preventDefault();
    if (!selectedEnterpriseId) return;
    setBusy(true);
    setError("");
    try {
      await postJson(`/enterprise/${selectedEnterpriseId}/resources`, {
        resourceType: resourceForm.resourceType,
        quantity: Number(resourceForm.quantity || 0),
        cost: Number(resourceForm.cost || 0)
      });
      setResourceForm((prev) => ({ ...prev, quantity: "", cost: "" }));
      await loadEnterpriseDetail(selectedEnterpriseId);
    } catch (_error) {
      setError("Unable to save enterprise resource.");
    } finally {
      setBusy(false);
    }
  };

  const logOutput = async (event) => {
    event.preventDefault();
    if (!selectedEnterpriseId) return;
    setBusy(true);
    setError("");
    try {
      await postJson(`/enterprise/${selectedEnterpriseId}/outputs`, {
        outputType: outputForm.outputType,
        quantity: Number(outputForm.quantity || 0),
        revenue: Number(outputForm.revenue || 0)
      });
      setOutputForm((prev) => ({ ...prev, quantity: "", revenue: "" }));
      await loadEnterpriseDetail(selectedEnterpriseId);
    } catch (_error) {
      setError("Unable to save enterprise output.");
    } finally {
      setBusy(false);
    }
  };

  const createContract = async (event) => {
    event.preventDefault();
    if (!selectedEnterpriseId) return;
    setBusy(true);
    setError("");
    try {
      await postJson(`/enterprise/${selectedEnterpriseId}/contracts`, {
        buyerName: contractForm.buyerName,
        outputType: contractForm.outputType,
        quantity: Number(contractForm.quantity || 0),
        unitPriceKes: Number(contractForm.unitPriceKes || 0),
        deliveryDate: contractForm.deliveryDate,
      });
      setContractForm((prev) => ({ ...prev, buyerName: "", quantity: "", unitPriceKes: "" }));
    } catch (_error) {
      setError("Unable to create enterprise contract.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="row">
        <h3>Universal Enterprise Engine</h3>
        <small>Template-driven calendar, costs, outputs, and AI decisions</small>
      </div>

      {!farmId ? <p>Complete onboarding to start enterprises.</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {farmId ? (
        <>
          <form className="auth-form enterprise-form" onSubmit={addEnterprise}>
            <h4>Add Enterprise</h4>
            <select value={newEnterprise.type} onChange={(e) => setNewEnterprise((p) => ({ ...p, type: e.target.value }))}>
              {Array.from(new Set(templates.map((item) => item.type))).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select value={newEnterprise.subtype} onChange={(e) => setNewEnterprise((p) => ({ ...p, subtype: e.target.value }))}>
              {subtypeOptions.map((subtype) => (
                <option key={subtype} value={subtype}>{subtype}</option>
              ))}
            </select>
            <input placeholder="Enterprise name (optional)" value={newEnterprise.name} onChange={(e) => setNewEnterprise((p) => ({ ...p, name: e.target.value }))} />
            <input type="date" value={newEnterprise.startDate} onChange={(e) => setNewEnterprise((p) => ({ ...p, startDate: e.target.value }))} />
            <input placeholder="Scale units" value={newEnterprise.scaleUnits} onChange={(e) => setNewEnterprise((p) => ({ ...p, scaleUnits: e.target.value }))} />
            <input placeholder="Scale unit label" value={newEnterprise.scaleUnitLabel} onChange={(e) => setNewEnterprise((p) => ({ ...p, scaleUnitLabel: e.target.value }))} />
            <button type="submit" disabled={busy}>{busy ? "Saving..." : "Create Enterprise"}</button>
          </form>

          <div className="enterprise-grid">
            <div className="enterprise-list">
              <h4>My Enterprises</h4>
              {enterprises.length === 0 ? <p>No enterprises yet.</p> : null}
              {enterprises.map((enterprise) => (
                <button
                  key={enterprise.id}
                  type="button"
                  className={`enterprise-item ${selectedEnterpriseId === enterprise.id ? "active" : ""}`}
                  onClick={() => setSelectedEnterpriseId(enterprise.id)}
                >
                  <strong>{enterprise.name}</strong>
                  <small>{enterprise.type}/{enterprise.subtype}</small>
                </button>
              ))}
            </div>

            <div className="enterprise-detail">
              {selectedEnterpriseId ? (
                <>
                  <div className="grid-3">
                    <div className="kpi-card">
                      <p>Enterprise Revenue</p>
                      <h3>KES {Number(financials?.totals?.revenue || 0).toLocaleString()}</h3>
                    </div>
                    <div className="kpi-card">
                      <p>Enterprise Cost</p>
                      <h3>KES {Number(financials?.totals?.cost || 0).toLocaleString()}</h3>
                    </div>
                    <div className="kpi-card">
                      <p>Enterprise Profit</p>
                      <h3>KES {Number(financials?.totals?.profit || 0).toLocaleString()}</h3>
                    </div>
                  </div>

                  <div className="enterprise-insights">
                    <h4>AI Calendar and Decision Engine</h4>
                    <p>
                      Predicted output: <strong>{aiInsights.yield?.predicted_output || 0} {aiInsights.yield?.unit || "units"}</strong>
                      {" "}({Math.round(Number(aiInsights.yield?.confidence || 0) * 100)}% confidence)
                    </p>
                    <p>Target savings: KES {Number(aiInsights.costs?.target_savings || 0).toLocaleString()}</p>
                    <ul className="simple-list">
                      {(aiInsights.actions?.actions || []).map((item, index) => (
                        <li key={`${item.action}-${index}`}><strong>{item.priority}:</strong> {item.action}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="enterprise-calendar">
                    <h4>Upcoming Tasks</h4>
                    <ul className="simple-list">
                      {calendar.slice(0, 14).map((task) => (
                        <li key={`${task.id}-${task.scheduledDate}`}>
                          {task.scheduledDate}: {task.activityType} ({task.status})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="enterprise-actions">
                    <form className="auth-form" onSubmit={logResource}>
                      <h4>Log Resource Cost</h4>
                      <input placeholder="Type (feed, fertilizer, water, labor)" value={resourceForm.resourceType} onChange={(e) => setResourceForm((p) => ({ ...p, resourceType: e.target.value }))} />
                      <input placeholder="Quantity" value={resourceForm.quantity} onChange={(e) => setResourceForm((p) => ({ ...p, quantity: e.target.value }))} />
                      <input placeholder="Cost KES" value={resourceForm.cost} onChange={(e) => setResourceForm((p) => ({ ...p, cost: e.target.value }))} />
                      <button type="submit" disabled={busy}>Save resource</button>
                    </form>

                    <form className="auth-form" onSubmit={logOutput}>
                      <h4>Log Output Revenue</h4>
                      <input placeholder="Output type" value={outputForm.outputType} onChange={(e) => setOutputForm((p) => ({ ...p, outputType: e.target.value }))} />
                      <input placeholder="Quantity" value={outputForm.quantity} onChange={(e) => setOutputForm((p) => ({ ...p, quantity: e.target.value }))} />
                      <input placeholder="Revenue KES" value={outputForm.revenue} onChange={(e) => setOutputForm((p) => ({ ...p, revenue: e.target.value }))} />
                      <button type="submit" disabled={busy}>Save output</button>
                    </form>
                  </div>

                  <form className="auth-form" onSubmit={createContract}>
                    <h4>Enterprise Buyer Contract</h4>
                    <input placeholder="Buyer name" value={contractForm.buyerName} onChange={(e) => setContractForm((p) => ({ ...p, buyerName: e.target.value }))} />
                    <input placeholder="Output type" value={contractForm.outputType} onChange={(e) => setContractForm((p) => ({ ...p, outputType: e.target.value }))} />
                    <input placeholder="Quantity" value={contractForm.quantity} onChange={(e) => setContractForm((p) => ({ ...p, quantity: e.target.value }))} />
                    <input placeholder="Unit price KES" value={contractForm.unitPriceKes} onChange={(e) => setContractForm((p) => ({ ...p, unitPriceKes: e.target.value }))} />
                    <input type="date" value={contractForm.deliveryDate} onChange={(e) => setContractForm((p) => ({ ...p, deliveryDate: e.target.value }))} />
                    <button type="submit" disabled={busy}>Create contract</button>
                  </form>
                </>
              ) : (
                <p>Select an enterprise to view calendar and profit details.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
