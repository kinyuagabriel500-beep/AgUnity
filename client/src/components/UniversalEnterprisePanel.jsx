import { useEffect, useMemo, useState } from "react";
import { getJson } from "../api/client";

export default function UniversalEnterprisePanel({ title = "Universal Enterprise Model", subtitle = "Template-driven enterprises with blockchain supply chain support." }) {
  const [templates, setTemplates] = useState([]);
  const [batchCode, setBatchCode] = useState("");
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getJson("/enterprise/templates");
        setTemplates(data.items || []);
        setError("");
      } catch (_error) {
        setError("Unable to load enterprise templates.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of templates) {
      const current = map.get(item.type) || [];
      current.push(item);
      map.set(item.type, current);
    }
    return Array.from(map.entries()).map(([type, items]) => ({ type, items }));
  }, [templates]);

  const lookupBatch = async (event) => {
    event.preventDefault();
    const code = batchCode.trim();
    if (!code) return;
    setSearching(true);
    setError("");
    try {
      const data = await getJson(`/traceability/journey/${code}`);
      setJourney(data);
    } catch (_error) {
      setJourney(null);
      setError("Batch code not found.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="enterprise-overview">
      <div className="row">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <small>{loading ? "Loading templates..." : `${templates.length} templates loaded`}</small>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="enterprise-pill-row">
        {grouped.map((group) => (
          <span key={group.type} className="enterprise-pill">
            {group.type}: {group.items.length}
          </span>
        ))}
      </div>

      <div className="enterprise-template-grid">
        {templates.slice(0, 8).map((template) => (
          <article key={`${template.type}-${template.subtype}`} className="enterprise-template-card">
            <strong>{template.name}</strong>
            <small>{template.type} / {template.subtype}</small>
            <p>{Array.isArray(template.default_calendar) ? `${template.default_calendar.length} default calendar steps` : "Template-driven calendar"}</p>
          </article>
        ))}
      </div>

      <div className="enterprise-blockchain-card">
        <h4>Blockchain Supply Chain</h4>
        <p>
          Batches, events, contracts, and settlements are tracked through hashes, QR codes, and role-based workflow events.
          Users see simple supply-chain and contract actions without blockchain complexity.
        </p>
        <form className="auth-form" onSubmit={lookupBatch}>
          <input
            placeholder="Lookup batch code"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
          />
          <button type="submit" disabled={searching}>{searching ? "Looking up..." : "Verify batch"}</button>
        </form>

        {journey ? (
          <div className="journey-result">
            <div className="ledger-grid">
              <div><strong>Crop:</strong> {journey.crop}</div>
              <div><strong>Stage:</strong> {journey.currentStage || journey.supplyChainStage}</div>
              <div><strong>Settlement:</strong> {journey.settlementStatus}</div>
              <div><strong>Ledger:</strong> {journey.ledger?.verificationStatus || "unknown"}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
