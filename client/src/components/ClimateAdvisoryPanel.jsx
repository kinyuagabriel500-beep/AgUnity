import { useEffect, useState } from "react";
import { getJson } from "../api/client";

export default function ClimateAdvisoryPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getJson("/advisory/climate-plan");
      setPlan(data);
      setError("");
    } catch (_error) {
      setError("Unable to load climate advisory right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <section className="climate-panel">
        <div className="row">
          <h3>Climate Smart Advisory</h3>
        </div>
        <p>Loading tailored guidance...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="climate-panel">
        <div className="row">
          <h3>Climate Smart Advisory</h3>
          <button type="button" onClick={load}>Retry</button>
        </div>
        <p className="error">{error}</p>
      </section>
    );
  }

  return (
    <section className="climate-panel">
      <div className="row">
        <h3>Climate Smart Advisory</h3>
        <button type="button" onClick={load}>Refresh</button>
      </div>

      {plan?.farmFound ? (
        <>
          <p>
            Location: <strong>{plan.locationLabel}</strong> | Crop focus: <strong>{plan.crop}</strong> | Season: <strong>{plan.season}</strong>
          </p>

          <div className="grid-3">
            <div className="kpi-card">
              <p>Weather</p>
              <h3>{plan.weather?.condition || "Unknown"}</h3>
              <small>Rain risk: {plan.weather?.rainfall_probability ?? "n/a"}%</small>
            </div>
            <div className="kpi-card">
              <p>Top Crop Picks</p>
              <h3>{(plan.recommendations || []).slice(0, 2).join(", ") || "No data"}</h3>
              <small>{plan.recommendations?.[2] ? `+ ${plan.recommendations[2]}` : ""}</small>
            </div>
            <div className="kpi-card">
              <p>Advisory</p>
              <h3>{plan.advisoryTitle || "Field action"}</h3>
              <small>{plan.advisory || "No advisory available."}</small>
            </div>
          </div>

          <div className="calendar-grid">
            {(plan.cropCalendar || []).map((item) => (
              <article className="calendar-item" key={`${item.phase}-${item.window}`}>
                <strong>{item.phase}</strong>
                <span>{item.window}</span>
                <p>{item.action}</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p>{plan?.message || "Add a farm with GPS location to unlock climate-smart advisory."}</p>
      )}
    </section>
  );
}
