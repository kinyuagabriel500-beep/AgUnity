import { useEffect, useMemo, useState } from "react";
import { getJson, postJson } from "../api/client";

export default function MonetizationPanel({ farmId = "" }) {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: "crop-disease",
    title: "",
    description: "",
    urgency: "medium",
  });
  const [paymentForm, setPaymentForm] = useState({
    provider: "stripe",
    amountKes: 1500,
    purpose: "Premium advisory support",
    phoneNumber: "",
  });
  const [activePayment, setActivePayment] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [insuranceQuote, setInsuranceQuote] = useState(null);
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [insuranceForm, setInsuranceForm] = useState({
    cropType: "maize",
    coverAmountKes: 150000,
    seasonLabel: "long-rains"
  });
  const [claimForm, setClaimForm] = useState({
    policyId: "",
    incidentType: "drought",
    incidentDate: new Date().toISOString().slice(0, 10),
    amountRequestedKes: "",
    description: ""
  });

  const currency = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: "KES", maximumFractionDigits: 0 }),
    []
  );

  const load = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes, ticketsRes] = await Promise.all([
        getJson("/billing/plans"),
        getJson("/billing/subscription"),
        getJson("/billing/problem-tickets"),
      ]);
      setPlans(plansRes.items || []);
      setSubscription(subRes.item || null);
      setTickets(ticketsRes.items || []);

      const [statusRes, policiesRes] = await Promise.all([
        getJson("/integrations/status").catch(() => null),
        getJson("/finance/insurance/policies").catch(() => ({ items: [] }))
      ]);
      setIntegrationStatus(statusRes);
      setInsurancePolicies(policiesRes.items || []);
    } catch (_error) {
      setMessage("Billing service unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subscribe = async (planCode) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await postJson("/billing/subscribe", { planCode });
      setMessage(response.message || "Subscription updated.");
      await load();
    } catch (_error) {
      setMessage("Unable to activate plan.");
    } finally {
      setBusy(false);
    }
  };

  const topupCredits = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await postJson("/billing/topup-credits", { credits: 50 });
      setMessage(`Added 50 credits. Remaining: ${response.advisoryCreditsRemaining}`);
      await load();
    } catch (_error) {
      setMessage("Unable to top up credits.");
    } finally {
      setBusy(false);
    }
  };

  const submitTicket = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await postJson("/billing/problem-tickets", {
        farmId: farmId || undefined,
        category: ticketForm.category,
        title: ticketForm.title,
        description: ticketForm.description,
        urgency: ticketForm.urgency,
      });
      setMessage(
        response.billingSource === "subscription_credit"
          ? "Ticket opened using subscription credit."
          : `Ticket opened and billed ${currency.format(response.billedAmountKes || 0)}.`
      );
      setTicketForm((p) => ({ ...p, title: "", description: "" }));
      await load();
    } catch (_error) {
      setMessage("Unable to create support ticket.");
    } finally {
      setBusy(false);
    }
  };

  const startCheckout = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        provider: paymentForm.provider,
        amountKes: Number(paymentForm.amountKes),
        purpose: paymentForm.purpose,
      };

      if (paymentForm.provider === "mpesa") {
        payload.phoneNumber = paymentForm.phoneNumber;
      }

      const response = await postJson("/payments/checkout", payload);
      setActivePayment(response.transaction || null);

      if (response.provider === "stripe" && response.checkoutUrl) {
        window.open(response.checkoutUrl, "_blank", "noopener,noreferrer");
        setMessage("Stripe checkout opened in a new tab. Complete payment then click Verify.");
      } else {
        setMessage(response.customerMessage || "M-Pesa STK push sent. Approve on your phone, then click Verify.");
      }
    } catch (_error) {
      setMessage("Unable to start checkout. Check provider config and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyPayment = async () => {
    if (!activePayment?.id) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await postJson(`/payments/${activePayment.id}/verify`, {});
      setActivePayment(response.item || activePayment);

      if (response.item?.status === "paid") {
        setMessage("Payment verified and marked as paid.");
      } else if (response.item?.status === "failed") {
        setMessage("Payment failed. Try again or switch provider.");
      } else {
        setMessage("Payment is still processing. Please retry verification shortly.");
      }
    } catch (_error) {
      setMessage("Unable to verify payment status.");
    } finally {
      setBusy(false);
    }
  };

  const getInsuranceQuote = async (event) => {
    event.preventDefault();
    if (!farmId) {
      setMessage("Create or select a farm before requesting insurance quote.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const query = new URLSearchParams({
        farmId,
        coverAmountKes: String(Number(insuranceForm.coverAmountKes || 0)),
        cropType: insuranceForm.cropType,
        seasonLabel: insuranceForm.seasonLabel
      });
      const response = await getJson(`/finance/insurance/quote?${query.toString()}`);
      setInsuranceQuote(response.quote || null);
      setMessage("Insurance quote generated.");
    } catch (_error) {
      setMessage("Unable to generate insurance quote.");
    } finally {
      setBusy(false);
    }
  };

  const createInsurancePolicy = async () => {
    if (!farmId || !insuranceQuote) {
      setMessage("Generate a quote first.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await postJson("/finance/insurance/policies", {
        farmId,
        coverAmountKes: Number(insuranceForm.coverAmountKes || 0),
        cropType: insuranceForm.cropType,
        seasonLabel: insuranceForm.seasonLabel
      });
      setMessage(`Insurance policy ${response.policy.policyNumber} created.`);
      await load();
    } catch (_error) {
      setMessage("Unable to create insurance policy.");
    } finally {
      setBusy(false);
    }
  };

  const submitClaim = async (event) => {
    event.preventDefault();
    if (!farmId) {
      setMessage("Create or select a farm before filing claim.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      await postJson("/finance/insurance/claims", {
        farmId,
        policyId: claimForm.policyId,
        incidentType: claimForm.incidentType,
        incidentDate: claimForm.incidentDate,
        amountRequestedKes: Number(claimForm.amountRequestedKes || 0),
        description: claimForm.description
      });
      setMessage("Insurance claim submitted.");
      setClaimForm((current) => ({
        ...current,
        amountRequestedKes: "",
        description: ""
      }));
      await load();
    } catch (_error) {
      setMessage("Unable to submit insurance claim.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="monetization-panel">
      <div className="row">
        <h3>Revenue Engine: Paid Problem Solving</h3>
        <small>{loading ? "Loading..." : `Plans: ${plans.length}`}</small>
      </div>
      <p>Monetize premium advisory and operational troubleshooting with plans, credits, and per-case billing.</p>

      {message ? <p>{message}</p> : null}

      <div className="plan-grid">
        {plans.map((plan) => (
          <article key={plan.id} className="plan-card">
            <strong>{plan.name}</strong>
            <p>{plan.description}</p>
            <p>{currency.format(Number(plan.priceKes || 0))} / {plan.billingCycle}</p>
            <small>
              {plan.includedTickets} tickets, {plan.includedAdvisoryCredits} credits
            </small>
            <button disabled={busy} onClick={() => subscribe(plan.code)}>
              {busy ? "Processing..." : `Activate ${plan.name}`}
            </button>
          </article>
        ))}
      </div>

      <div className="subscription-strip">
        <strong>
          Active: {subscription?.plan?.name || "No active plan"}
        </strong>
        <span>
          Credits: {subscription?.advisoryCreditsRemaining ?? 0}
        </span>
        <button disabled={busy || !subscription} onClick={topupCredits}>Top-up 50 credits</button>
      </div>

      <form className="auth-form payment-rail" onSubmit={startCheckout}>
        <h4>Real Payment Checkout (M-Pesa / Stripe)</h4>
        <select
          value={paymentForm.provider}
          onChange={(e) => setPaymentForm((p) => ({ ...p, provider: e.target.value }))}
        >
          <option value="stripe">Stripe (Card)</option>
          <option value="mpesa">M-Pesa STK Push</option>
        </select>
        <input
          type="number"
          min="1"
          value={paymentForm.amountKes}
          onChange={(e) => setPaymentForm((p) => ({ ...p, amountKes: e.target.value }))}
          placeholder="Amount in KES"
          required
        />
        <input
          value={paymentForm.purpose}
          onChange={(e) => setPaymentForm((p) => ({ ...p, purpose: e.target.value }))}
          placeholder="Payment purpose"
          required
        />
        {paymentForm.provider === "mpesa" ? (
          <input
            value={paymentForm.phoneNumber}
            onChange={(e) => setPaymentForm((p) => ({ ...p, phoneNumber: e.target.value }))}
            placeholder="Phone e.g 0712345678"
            required
          />
        ) : null}
        <div className="inline-actions">
          <button type="submit" disabled={busy}>{busy ? "Starting..." : "Start Checkout"}</button>
          <button type="button" disabled={busy || !activePayment?.id} onClick={verifyPayment}>Verify Latest Payment</button>
        </div>
        {activePayment ? (
          <small>
            Tx: {activePayment.id.slice(0, 8)} | Provider: {activePayment.provider} | Status: {activePayment.status}
          </small>
        ) : null}
      </form>

      <form className="auth-form" onSubmit={submitTicket}>
        <h4>Open Paid Problem Ticket</h4>
        <select
          value={ticketForm.category}
          onChange={(e) => setTicketForm((p) => ({ ...p, category: e.target.value }))}
        >
          <option value="crop-disease">Crop disease</option>
          <option value="pest-outbreak">Pest outbreak</option>
          <option value="market-pricing">Market pricing</option>
          <option value="water-management">Water management</option>
          <option value="enterprise-optimization">Enterprise optimization</option>
        </select>
        <select
          value={ticketForm.urgency}
          onChange={(e) => setTicketForm((p) => ({ ...p, urgency: e.target.value }))}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          placeholder="Issue title"
          value={ticketForm.title}
          onChange={(e) => setTicketForm((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <input
          placeholder="Describe the problem and expected outcome"
          value={ticketForm.description}
          onChange={(e) => setTicketForm((p) => ({ ...p, description: e.target.value }))}
          required
        />
        <button type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit paid ticket"}</button>
      </form>

      <div>
        <h4>Recent Tickets</h4>
        <ul className="simple-list">
          {tickets.slice(0, 6).map((item) => (
            <li key={item.id}>
              {item.title} - {item.status} - billed KES {Number(item.billedAmountKes || 0).toLocaleString()}
            </li>
          ))}
          {!tickets.length ? <li>No tickets submitted yet.</li> : null}
        </ul>
      </div>

      <form className="auth-form" onSubmit={getInsuranceQuote}>
        <h4>Crop Insurance</h4>
        <input
          placeholder="Crop type"
          value={insuranceForm.cropType}
          onChange={(e) => setInsuranceForm((p) => ({ ...p, cropType: e.target.value }))}
          required
        />
        <input
          type="number"
          min="1000"
          placeholder="Cover amount KES"
          value={insuranceForm.coverAmountKes}
          onChange={(e) => setInsuranceForm((p) => ({ ...p, coverAmountKes: e.target.value }))}
          required
        />
        <input
          placeholder="Season label"
          value={insuranceForm.seasonLabel}
          onChange={(e) => setInsuranceForm((p) => ({ ...p, seasonLabel: e.target.value }))}
          required
        />
        <div className="inline-actions">
          <button type="submit" disabled={busy}>{busy ? "Calculating..." : "Get quote"}</button>
          <button type="button" disabled={busy || !insuranceQuote} onClick={createInsurancePolicy}>Create policy</button>
        </div>
        {insuranceQuote ? (
          <small>
            Premium: {currency.format(Number(insuranceQuote.premiumKes || 0))} | Cover: {currency.format(Number(insuranceQuote.coverAmountKes || 0))}
          </small>
        ) : null}
      </form>

      <form className="auth-form" onSubmit={submitClaim}>
        <h4>Insurance Claim</h4>
        <select
          value={claimForm.policyId}
          onChange={(e) => setClaimForm((p) => ({ ...p, policyId: e.target.value }))}
          required
        >
          <option value="">Select policy</option>
          {insurancePolicies.map((policy) => (
            <option key={policy.id} value={policy.id}>{policy.policyNumber} ({policy.status})</option>
          ))}
        </select>
        <select
          value={claimForm.incidentType}
          onChange={(e) => setClaimForm((p) => ({ ...p, incidentType: e.target.value }))}
        >
          <option value="drought">Drought</option>
          <option value="flood">Flood</option>
          <option value="pest">Pest</option>
          <option value="disease">Disease</option>
          <option value="storm">Storm</option>
          <option value="other">Other</option>
        </select>
        <input
          type="date"
          value={claimForm.incidentDate}
          onChange={(e) => setClaimForm((p) => ({ ...p, incidentDate: e.target.value }))}
          required
        />
        <input
          type="number"
          min="100"
          placeholder="Amount requested KES"
          value={claimForm.amountRequestedKes}
          onChange={(e) => setClaimForm((p) => ({ ...p, amountRequestedKes: e.target.value }))}
          required
        />
        <input
          placeholder="Claim details"
          value={claimForm.description}
          onChange={(e) => setClaimForm((p) => ({ ...p, description: e.target.value }))}
          required
        />
        <button type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit claim"}</button>
      </form>

      <div>
        <h4>Integration Readiness</h4>
        {integrationStatus ? (
          <ul className="simple-list">
            <li>AI service: {integrationStatus.aiService?.reachable ? "live" : "offline/degraded"}</li>
            <li>Media diagnosis: {integrationStatus.mediaDiagnosis?.mode}</li>
            <li>IPFS mode: {integrationStatus.traceability?.ipfs?.mode}</li>
            <li>Polygon mode: {integrationStatus.traceability?.polygon?.mode}</li>
            <li>Payments: {integrationStatus.payments?.mpesaConfigured || integrationStatus.payments?.stripeConfigured ? "configured" : "not configured"}</li>
          </ul>
        ) : (
          <p>Integration status unavailable.</p>
        )}
      </div>
    </section>
  );
}
