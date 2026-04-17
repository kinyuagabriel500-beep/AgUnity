import { useCallback, useEffect, useMemo, useState } from "react";
import IconTile from "../components/IconTile";
import KpiCard from "../components/KpiCard";
import NetworkBadge from "../components/NetworkBadge";
import FarmerChatPanel from "../components/FarmerChatPanel";
import EnterpriseManagerPanel from "../components/EnterpriseManagerPanel";
import MonetizationPanel from "../components/MonetizationPanel";
import { getJson, postJson } from "../api/client";

const REFRESH_INTERVAL_MS = 90 * 1000;
const STEP_TITLES = [
  "Farm profile",
  "Crop and season",
  "First expense",
  "First planned activity"
];

const COUNTRY_OPTIONS = [
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Burundi",
  "Ethiopia",
  "Nigeria",
  "Ghana",
  "South Africa",
  "India",
  "Pakistan",
  "Bangladesh",
  "Indonesia",
  "Philippines",
  "Thailand",
  "Vietnam",
  "Brazil",
  "Mexico",
  "United States",
  "Canada",
  "United Kingdom",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Australia",
  "New Zealand"
];

const dedupeAlerts = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const signature = `${item.title || ""}::${item.message || ""}`;
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
};

export default function FarmerDashboard() {
  const [state, setState] = useState({
    loading: true,
    online: true,
    farmId: "",
    activities: [],
    alerts: [],
    profit: 0,
    score: 0,
    carbon: 0,
    needsOnboarding: false
  });
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Location not detected yet.");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [autoDetectAttempted, setAutoDetectAttempted] = useState(false);
  const [onboarding, setOnboarding] = useState({
    name: "",
    location: "",
    country: "Kenya",
    county: "",
    locationLatitude: "",
    locationLongitude: "",
    locationAccuracyMeters: "",
    locationSource: "manual",
    acreageHectares: "",
    crop: "",
    season: "",
    firstExpenseCategory: "",
    firstExpenseAmountKes: "",
    firstExpenseDate: new Date().toISOString().slice(0, 10),
    firstExpenseNotes: "",
    firstActivityType: "planting",
    firstActivityDate: new Date().toISOString().slice(0, 10),
    firstActivityCostKes: "0",
    firstActivityNotes: ""
  });
  const [wizardStep, setWizardStep] = useState(1);

  const fetchAlerts = useCallback(async (farmId) => {
    try {
      const query = farmId ? `?farmId=${farmId}` : "";
      const alerts = await getJson(`/advisory/alerts${query}`);
      setState((p) => ({ ...p, alerts: dedupeAlerts(alerts.items || []), online: true }));
    } catch (_error) {
      setState((p) => ({ ...p, online: false }));
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const farms = await getJson("/farms");
      const farmId = farms.items?.[0]?.id;
      if (!farmId) {
        const advisory = await getJson("/advisory/alerts").catch(() => ({ items: [] }));
        setState({
          loading: false,
          online: true,
          farmId: "",
          activities: [],
          alerts: dedupeAlerts(advisory.items || []),
          profit: 0,
          score: 0,
          carbon: 0,
          needsOnboarding: true
        });
        return;
      }

      const [profit, score, carbon, activities, alerts] = await Promise.all([
        getJson(`/farm-profit?farmId=${farmId}`),
        getJson(`/farm-score?farmId=${farmId}`),
        getJson(`/carbon/summary?farmId=${farmId}`),
        getJson(`/activities?farmId=${farmId}`),
        getJson(`/advisory/alerts?farmId=${farmId}`)
      ]);

      setState({
        loading: false,
        online: true,
        farmId,
        needsOnboarding: false,
        activities: (activities.items || []).map((a) => ({
          icon: a.type === "planting" ? "🌱" : a.type === "spraying" ? "🧪" : "🚜",
          label: a.type,
          value: `${a.date}${a.notes ? ` - ${a.notes}` : ""}`
        })),
        alerts: dedupeAlerts(alerts.items || []),
        profit: Number(profit.totals?.profit || 0),
        score: Number(score.scores?.overall || 0),
        carbon: Number(carbon.earningKes || 0)
      });
    } catch (_error) {
      setState((p) => ({
        ...p,
        loading: false,
        online: false,
        alerts: [
          {
            id: "alerts-offline",
            title: "Advisory service unreachable",
            message: "Please check your connection and try again.",
            severity: "high"
          }
        ]
      }));
    }
  }, []);

  const resolveDetectedLocation = useCallback(async (coords) => {
    const fallbackLocation = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) {
        return {
          location: fallbackLocation,
          country: "",
          county: "",
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: Math.round(coords.accuracy || 0),
          source: "browser-geolocation"
        };
      }
      const data = await response.json();
      return {
        location: data.display_name || fallbackLocation,
        country: data.address?.country || "",
        county: data.address?.county || data.address?.state || data.address?.region || "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: Math.round(coords.accuracy || 0),
        source: "browser-geolocation"
      };
    } catch (_error) {
      return {
        location: fallbackLocation,
        country: "",
        county: "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: Math.round(coords.accuracy || 0),
        source: "browser-geolocation"
      };
    }
  }, []);

  const resolveApproximateLocationFromIp = useCallback(async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) return null;
      const data = await response.json();
      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

      return {
        location: [data.city, data.region, data.country_name].filter(Boolean).join(", ") || data.country_name || "",
        country: data.country_name || "",
        county: data.region || "",
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null,
        accuracyMeters: null,
        source: "ip-approximation"
      };
    } catch (_error) {
      return null;
    }
  }, []);

  const detectCurrentLocation = useCallback(async () => {
    setDetectingLocation(true);
    setLocationStatus("Detecting your farm location...");

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation API unavailable");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 300000
        });
      });

      const detected = await resolveDetectedLocation(position.coords);
      setOnboarding((current) => ({
        ...current,
        location: detected.location,
        country: detected.country || current.country,
        county: current.county || detected.county,
        locationLatitude: String(detected.latitude),
        locationLongitude: String(detected.longitude),
        locationAccuracyMeters: String(detected.accuracyMeters || ""),
        locationSource: detected.source
      }));
      setLocationStatus(
        `Detected at ${detected.location}${detected.accuracyMeters ? ` (${detected.accuracyMeters}m accuracy)` : ""}.`
      );
    } catch (_error) {
      const approximate = await resolveApproximateLocationFromIp();
      if (approximate?.location) {
        setOnboarding((current) => ({
          ...current,
          location: current.location || approximate.location,
          country: current.country || approximate.country || current.country,
          county: current.county || approximate.county,
          locationLatitude:
            approximate.latitude !== null && approximate.latitude !== undefined
              ? String(approximate.latitude)
              : current.locationLatitude,
          locationLongitude:
            approximate.longitude !== null && approximate.longitude !== undefined
              ? String(approximate.longitude)
              : current.locationLongitude,
          locationSource: approximate.source
        }));
        setLocationStatus("GPS is blocked/unavailable. Approximate location was auto-filled from network; verify before saving.");
      } else {
        setLocationStatus("Location detection was blocked or unavailable. Enter it manually.");
      }
    } finally {
      setDetectingLocation(false);
    }
  }, [resolveDetectedLocation, resolveApproximateLocationFromIp]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (state.needsOnboarding && !autoDetectAttempted) {
      setAutoDetectAttempted(true);
      detectCurrentLocation();
    }
  }, [state.needsOnboarding, autoDetectAttempted, detectCurrentLocation]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchAlerts(state.farmId);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.farmId, fetchAlerts]);

  const submitOnboarding = async (event) => {
    event.preventDefault();
    setSavingOnboarding(true);
    try {
      await postJson("/onboarding/bootstrap", {
        name: onboarding.name,
        location: onboarding.location,
        country: onboarding.country,
        county: onboarding.county,
        locationLatitude: onboarding.locationLatitude ? Number(onboarding.locationLatitude) : undefined,
        locationLongitude: onboarding.locationLongitude ? Number(onboarding.locationLongitude) : undefined,
        locationAccuracyMeters: onboarding.locationAccuracyMeters
          ? Number(onboarding.locationAccuracyMeters)
          : undefined,
        locationSource: onboarding.locationSource || undefined,
        acreageHectares: onboarding.acreageHectares || 0,
        crop: onboarding.crop,
        season: onboarding.season,
        firstExpense:
          onboarding.firstExpenseCategory && Number(onboarding.firstExpenseAmountKes || 0) > 0
            ? {
                category: onboarding.firstExpenseCategory,
                amountKes: Number(onboarding.firstExpenseAmountKes),
                expenseDate: onboarding.firstExpenseDate,
                notes: onboarding.firstExpenseNotes || undefined
              }
            : undefined,
        firstPlannedActivity: {
          type: onboarding.firstActivityType,
          date: onboarding.firstActivityDate,
          costKes: Number(onboarding.firstActivityCostKes || 0),
          notes: onboarding.firstActivityNotes || undefined
        }
      });
      await loadDashboard();
    } finally {
      setSavingOnboarding(false);
    }
  };

  const activityTiles = useMemo(() => state.activities.slice(0, 6), [state.activities]);
  const canGoNextFromStep1 = onboarding.name.trim() && onboarding.location.trim() && onboarding.country.trim();
  const canGoNextFromStep2 = onboarding.crop.trim() && onboarding.season.trim();
  const countryOptions = useMemo(() => {
    if (!onboarding.country || COUNTRY_OPTIONS.includes(onboarding.country)) {
      return COUNTRY_OPTIONS;
    }
    return [onboarding.country, ...COUNTRY_OPTIONS];
  }, [onboarding.country]);

  const nextStep = () => {
    if (wizardStep === 1 && !canGoNextFromStep1) return;
    if (wizardStep === 2 && !canGoNextFromStep2) return;
    setWizardStep((p) => Math.min(p + 1, 4));
  };

  const prevStep = () => setWizardStep((p) => Math.max(p - 1, 1));

  const handleNextStep = (event) => {
    event.preventDefault();
    nextStep();
  };

  const handlePrevStep = (event) => {
    event.preventDefault();
    prevStep();
  };

  return (
    <div className="dashboard">
      <div className="row">
        <h2>Farmer Dashboard</h2>
        <NetworkBadge online={state.online} />
      </div>

      <div className="grid-3">
        <KpiCard
          title="Profit (KES)"
          value={state.loading ? "Loading..." : `KES ${state.profit.toLocaleString()}`}
          hint="Revenue - Costs"
        />
        <KpiCard
          title="Farm Score"
          value={state.loading ? "Loading..." : `${state.score}/100`}
          hint="Productivity + Sustainability + Reliability"
        />
        <KpiCard
          title="Carbon Earnings"
          value={state.loading ? "Loading..." : `KES ${state.carbon.toLocaleString()}`}
          hint="Estimated credits"
        />
      </div>

      {state.needsOnboarding ? (
        <section>
          <h3>Complete Farm Setup</h3>
          <p>Create your first farm to unlock live insights, advisory alerts, and profit tracking.</p>
          <div className="wizard-steps" aria-label="Onboarding steps">
            {STEP_TITLES.map((title, index) => {
              const stepNumber = index + 1;
              return (
                <span
                  key={title}
                  className={`wizard-step ${stepNumber === wizardStep ? "active" : ""} ${stepNumber < wizardStep ? "done" : ""}`}
                >
                  {stepNumber}. {title}
                </span>
              );
            })}
          </div>
          <form className="auth-form" onSubmit={submitOnboarding}>
            {wizardStep === 1 ? (
              <>
                <input
                  placeholder="Farm name"
                  value={onboarding.name}
                  onChange={(e) => setOnboarding((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <input
                  placeholder="Detected location"
                  value={onboarding.location}
                  onChange={(e) => setOnboarding((p) => ({ ...p, location: e.target.value, locationSource: "manual" }))}
                  required
                />
                <select
                  value={onboarding.country}
                  onChange={(e) => setOnboarding((p) => ({ ...p, country: e.target.value }))}
                  required
                  aria-label="Country"
                >
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <input
                  placeholder="County"
                  value={onboarding.county}
                  onChange={(e) => setOnboarding((p) => ({ ...p, county: e.target.value }))}
                />
                <div className="location-card">
                  <p>{locationStatus}</p>
                  <div className="location-grid">
                    <input
                      placeholder="Latitude"
                      value={onboarding.locationLatitude}
                      onChange={(e) => setOnboarding((p) => ({ ...p, locationLatitude: e.target.value, locationSource: "manual" }))}
                    />
                    <input
                      placeholder="Longitude"
                      value={onboarding.locationLongitude}
                      onChange={(e) => setOnboarding((p) => ({ ...p, locationLongitude: e.target.value, locationSource: "manual" }))}
                    />
                  </div>
                  <input
                    placeholder="Accuracy in meters"
                    value={onboarding.locationAccuracyMeters}
                    onChange={(e) => setOnboarding((p) => ({ ...p, locationAccuracyMeters: e.target.value, locationSource: "manual" }))}
                  />
                  <div className="wizard-actions">
                    <button type="button" className="link-btn" onClick={detectCurrentLocation} disabled={detectingLocation || savingOnboarding}>
                      {detectingLocation ? "Detecting..." : "Detect my location"}
                    </button>
                  </div>
                </div>
                <input
                  placeholder="Acreage (hectares)"
                  value={onboarding.acreageHectares}
                  onChange={(e) => setOnboarding((p) => ({ ...p, acreageHectares: e.target.value }))}
                />
              </>
            ) : null}

            {wizardStep === 2 ? (
              <>
                <input
                  placeholder="Primary crop"
                  value={onboarding.crop}
                  onChange={(e) => setOnboarding((p) => ({ ...p, crop: e.target.value }))}
                  required
                />
                <input
                  placeholder="Season (e.g. long-rains)"
                  value={onboarding.season}
                  onChange={(e) => setOnboarding((p) => ({ ...p, season: e.target.value }))}
                  required
                />
              </>
            ) : null}

            {wizardStep === 3 ? (
              <>
                <input
                  placeholder="First expense category (e.g. seeds)"
                  value={onboarding.firstExpenseCategory}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstExpenseCategory: e.target.value }))}
                />
                <input
                  placeholder="Amount KES"
                  value={onboarding.firstExpenseAmountKes}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstExpenseAmountKes: e.target.value }))}
                />
                <input
                  type="date"
                  value={onboarding.firstExpenseDate}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstExpenseDate: e.target.value }))}
                />
                <input
                  placeholder="Expense notes (optional)"
                  value={onboarding.firstExpenseNotes}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstExpenseNotes: e.target.value }))}
                />
              </>
            ) : null}

            {wizardStep === 4 ? (
              <>
                <select
                  value={onboarding.firstActivityType}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstActivityType: e.target.value }))}
                >
                  <option value="planting">Planting</option>
                  <option value="spraying">Spraying</option>
                  <option value="harvesting">Harvesting</option>
                </select>
                <input
                  type="date"
                  value={onboarding.firstActivityDate}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstActivityDate: e.target.value }))}
                  required
                />
                <input
                  placeholder="Planned cost KES"
                  value={onboarding.firstActivityCostKes}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstActivityCostKes: e.target.value }))}
                />
                <input
                  placeholder="Activity notes"
                  value={onboarding.firstActivityNotes}
                  onChange={(e) => setOnboarding((p) => ({ ...p, firstActivityNotes: e.target.value }))}
                />
              </>
            ) : null}

            <div className="wizard-actions">
              <button
                type="button"
                className="link-btn"
                onClick={handlePrevStep}
                disabled={wizardStep === 1 || savingOnboarding}
                aria-label="Go to previous onboarding step"
              >
                Back
              </button>

              {wizardStep < 4 ? (
                <button type="button" onClick={handleNextStep} disabled={savingOnboarding} aria-label="Go to next onboarding step">
                  Next
                </button>
              ) : (
                <button type="submit" disabled={savingOnboarding}>
                  {savingOnboarding ? "Setting up..." : "Start Farming"}
                </button>
              )}
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <div className="row">
          <h3>Alerts</h3>
          <button type="button" onClick={() => fetchAlerts(state.farmId)}>Refresh alerts</button>
        </div>
        <ul className="simple-list">
          {state.alerts.length
            ? state.alerts.map((a) => (
              <li key={a.id || `${a.title}-${a.message}`} className="alert-row">
                <span className={`severity-badge severity-${a.severity || "low"}`}>{(a.severity || "low").toUpperCase()}</span>{" "}
                <strong>{a.title || "Alert"}:</strong> {a.message}
              </li>
            ))
            : <li>No alerts yet. New advisories appear as data arrives.</li>}
        </ul>
      </section>

      <FarmerChatPanel farmId={state.farmId} />

      <EnterpriseManagerPanel farmId={state.farmId} />

      <MonetizationPanel farmId={state.farmId} />

      <section>
        <h3>Recent Activities</h3>
        <div className="tiles">
          {activityTiles.length
            ? activityTiles.map((a) => <IconTile key={`${a.label}-${a.value}`} {...a} />)
            : <p>No activities yet. Log activity from mobile or web.</p>}
        </div>
      </section>
    </div>
  );
}
