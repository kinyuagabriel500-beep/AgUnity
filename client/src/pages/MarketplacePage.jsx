import { useEffect, useMemo, useState } from "react";
import KpiCard from "../components/KpiCard";
import { getJson, postJson } from "../api/client";

const emptyCreateForm = {
  crop: "",
  quantityKg: "",
  pricePerKgKes: ""
};

const emptySellForm = {
  buyerName: "",
  quantityKg: "1",
  paymentStatus: "pending"
};

const toCurrency = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const toKg = (value) => `${Number(value || 0).toLocaleString()} kg`;

export default function MarketplacePage({ role = "farmer" }) {
  const isFarmer = role === "farmer";
  const isBuyer = role === "buyer" || role === "admin";
  const [state, setState] = useState({ loading: true, listings: [], priceDashboard: { salesMarket: [], listingMarket: [] }, farmId: "" });
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [sellForms, setSellForms] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const loadMarketplace = async () => {
    try {
      const [farmsRes, listingsRes, priceRes] = await Promise.all([
        isFarmer ? getJson("/farms") : Promise.resolve({ items: [] }),
        getJson("/marketplace/listings"),
        getJson("/marketplace/price-dashboard")
      ]);

      const farmId = farmsRes.items?.[0]?.id || "";
      setState({
        loading: false,
        farmId,
        listings: listingsRes.items || [],
        priceDashboard: priceRes || { salesMarket: [], listingMarket: [] }
      });
    } catch (_error) {
      setState((current) => ({ ...current, loading: false }));
      setError("Unable to load marketplace data right now.");
    }
  };

  useEffect(() => {
    loadMarketplace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshMarketplace = async () => {
    await loadMarketplace();
  };

  const stats = useMemo(() => {
    const active = state.listings.filter((item) => item.status === "active");
    const averageListingPrice = active.length
      ? Math.round(active.reduce((sum, item) => sum + Number(item.pricePerKgKes || 0), 0) / active.length)
      : 0;
    const totalVolume = active.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);

    return {
      activeLots: active.length,
      averageListingPrice,
      totalVolume
    };
  }, [state.listings]);

  const createListing = async (event) => {
    event.preventDefault();
    if (!state.farmId) {
      setError("Create your farm profile first to publish marketplace listings.");
      return;
    }

    setBusyAction("create-listing");
    setError("");
    setMessage("");
    try {
      await postJson("/marketplace/listings", {
        farmId: state.farmId,
        crop: createForm.crop,
        quantityKg: Number(createForm.quantityKg),
        pricePerKgKes: Number(createForm.pricePerKgKes)
      });
      setCreateForm(emptyCreateForm);
      setMessage("Listing created successfully.");
      await refreshMarketplace();
    } catch (requestError) {
      setError(requestError.message || "Unable to create listing.");
    } finally {
      setBusyAction("");
    }
  };

  const placeOrder = async (listing) => {
    setBusyAction(`order-${listing.id}`);
    setError("");
    setMessage("");
    try {
      await postJson("/marketplace/orders", {
        listingId: listing.id,
        quantityKg: 1,
        offeredPricePerKgKes: Number(listing.pricePerKgKes)
      });
      setMessage(`Order placed for ${listing.crop}.`);
      await refreshMarketplace();
    } catch (requestError) {
      setError(requestError.message || "Unable to place order.");
    } finally {
      setBusyAction("");
    }
  };

  const sellNow = async (listing) => {
    const sellForm = sellForms[listing.id] || emptySellForm;
    setBusyAction(`sell-${listing.id}`);
    setError("");
    setMessage("");
    try {
      await postJson("/marketplace/sell-now", {
        listingId: listing.id,
        quantityKg: Number(sellForm.quantityKg || 1),
        buyerName: sellForm.buyerName,
        paymentStatus: sellForm.paymentStatus
      });
      setMessage(`Sell-now executed for ${listing.crop}.`);
      setSellForms((current) => ({ ...current, [listing.id]: emptySellForm }));
      await refreshMarketplace();
    } catch (requestError) {
      setError(requestError.message || "Unable to sell now.");
    } finally {
      setBusyAction("");
    }
  };

  const salesRows = state.priceDashboard.salesMarket || [];
  const listingRows = state.priceDashboard.listingMarket || [];
  const ownListingIds = new Set(
    isFarmer && state.farmId ? state.listings.filter((item) => item.farmId === state.farmId).map((item) => item.id) : []
  );

  return (
    <div className="dashboard marketplace-page">
      <div className="row">
        <h2>Marketplace</h2>
        <button type="button" onClick={refreshMarketplace} disabled={state.loading}>Refresh</button>
      </div>

      <div className="grid-3">
        <KpiCard title="Active Lots" value={state.loading ? "Loading..." : String(stats.activeLots)} hint="Open produce listings" />
        <KpiCard title="Average Listing Price" value={state.loading ? "Loading..." : toCurrency(stats.averageListingPrice)} hint="Per kg across active lots" />
        <KpiCard title="Available Volume" value={state.loading ? "Loading..." : toKg(stats.totalVolume)} hint="Ready for purchase" />
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="marketplace-message">{message}</p> : null}

      <section>
        <h3>Price Dashboard</h3>
        <div className="marketplace-dashboard-grid">
          <div className="marketplace-dashboard-card">
            <h4>Sales Market</h4>
            {salesRows.length ? (
              <ul className="simple-list">
                {salesRows.map((row) => (
                  <li key={row.crop}>
                    <strong>{row.crop}</strong> - avg {toCurrency(row.avgPriceKes)}/kg from {toKg(row.totalVolumeKg)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No sales market data yet.</p>
            )}
          </div>
          <div className="marketplace-dashboard-card">
            <h4>Listing Market</h4>
            {listingRows.length ? (
              <ul className="simple-list">
                {listingRows.map((row) => (
                  <li key={row.crop}>
                    <strong>{row.crop}</strong> - avg {toCurrency(row.avgListingPriceKes)}/kg with {toKg(row.availableVolumeKg)} available
                  </li>
                ))}
              </ul>
            ) : (
              <p>No listing market data yet.</p>
            )}
          </div>
        </div>
      </section>

      {isFarmer ? (
        <section>
          <h3>Create Listing</h3>
          <p>Publish produce from your farm so buyers can order it from the marketplace.</p>
          {!state.farmId ? <p className="error">Create your farm profile first, then return here to post listings.</p> : null}
          <form className="auth-form marketplace-form" onSubmit={createListing}>
            <input
              placeholder="Crop"
              value={createForm.crop}
              onChange={(e) => setCreateForm((current) => ({ ...current, crop: e.target.value }))}
              required
            />
            <input
              placeholder="Quantity (kg)"
              type="number"
              min="1"
              step="0.01"
              value={createForm.quantityKg}
              onChange={(e) => setCreateForm((current) => ({ ...current, quantityKg: e.target.value }))}
              required
            />
            <input
              placeholder="Price per kg (KES)"
              type="number"
              min="1"
              step="0.01"
              value={createForm.pricePerKgKes}
              onChange={(e) => setCreateForm((current) => ({ ...current, pricePerKgKes: e.target.value }))}
              required
            />
            <button type="submit" disabled={busyAction === "create-listing"}>
              {busyAction === "create-listing" ? "Publishing..." : "Publish listing"}
            </button>
          </form>
        </section>
      ) : null}

      <section>
        <h3>Active Listings</h3>
        <div className="marketplace-listings">
          {state.loading ? <p>Loading listings...</p> : null}
          {!state.loading && !state.listings.length ? <p>No active listings yet.</p> : null}

          {state.listings.map((listing) => {
            const canSellNow = isFarmer && ownListingIds.has(listing.id);
            const sellForm = sellForms[listing.id] || emptySellForm;

            return (
              <article key={listing.id} className="marketplace-card">
                <div className="marketplace-card-header">
                  <div>
                    <span className="eyebrow">{listing.status}</span>
                    <h4>{listing.crop}</h4>
                  </div>
                  <strong>{toCurrency(listing.pricePerKgKes)}/kg</strong>
                </div>

                <p>{toKg(listing.quantityKg)} available</p>
                <p className="marketplace-meta">Farm ID: {listing.farmId}</p>

                {isBuyer ? (
                  <button type="button" onClick={() => placeOrder(listing)} disabled={busyAction === `order-${listing.id}`}>
                    {busyAction === `order-${listing.id}` ? "Ordering..." : "Place order"}
                  </button>
                ) : null}

                {canSellNow ? (
                  <div className="marketplace-sell-panel">
                    <h5>Sell now</h5>
                    <input
                      placeholder="Buyer name"
                      value={sellForm.buyerName}
                      onChange={(e) =>
                        setSellForms((current) => ({
                          ...current,
                          [listing.id]: { ...sellForm, buyerName: e.target.value }
                        }))
                      }
                    />
                    <input
                      placeholder="Quantity (kg)"
                      type="number"
                      min="1"
                      step="0.01"
                      value={sellForm.quantityKg}
                      onChange={(e) =>
                        setSellForms((current) => ({
                          ...current,
                          [listing.id]: { ...sellForm, quantityKg: e.target.value }
                        }))
                      }
                    />
                    <select
                      value={sellForm.paymentStatus}
                      onChange={(e) =>
                        setSellForms((current) => ({
                          ...current,
                          [listing.id]: { ...sellForm, paymentStatus: e.target.value }
                        }))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                    </select>
                    <button type="button" onClick={() => sellNow(listing)} disabled={busyAction === `sell-${listing.id}`}>
                      {busyAction === `sell-${listing.id}` ? "Selling..." : "Sell now"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}