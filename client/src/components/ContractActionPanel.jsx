import { useEffect, useMemo, useState } from "react";
import { getJson, patchJson } from "../api/client";

const statusOptionsByRole = {
  retailer: ["active", "delivered"],
  buyer: ["paid", "disputed"],
  admin: ["draft", "active", "delivered", "paid", "disputed"],
};

export default function ContractActionPanel({ role = "buyer" }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const allowedStatuses = useMemo(() => statusOptionsByRole[role] || ["paid", "disputed"], [role]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await getJson("/enterprise/contracts");
      setContracts(data.items || []);
      setError("");
    } catch (_error) {
      setError("Failed to load enterprise contracts for this role.");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const updateStatus = async (contractId, status) => {
    setBusyId(contractId);
    setMessage("");
    setError("");
    try {
      await patchJson(`/enterprise/contracts/${contractId}/status`, {
        status,
        settlementReference: status === "paid" ? `SET-${Date.now()}` : undefined,
      });
      setMessage(`Contract moved to ${status}.`);
      await loadContracts();
    } catch (_error) {
      setError("Unable to update contract status. Check role permissions.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section>
      <div className="row">
        <h3>Role Contract Actions</h3>
        <small>{loading ? "Loading..." : `${contracts.length} contract(s)`}</small>
      </div>
      <p>
        {role === "retailer" ? "Retailers can advance owned contracts to delivered." : "Buyers can mark assigned contracts as paid or disputed."}
      </p>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p>{message}</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Enterprise</th>
            <th>Buyer</th>
            <th>Output</th>
            <th>Status</th>
            <th>Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => {
            const value = Number(contract.quantity || 0) * Number(contract.unitPriceKes || 0);
            return (
              <tr key={contract.id}>
                <td>{contract.Enterprise?.name || "Enterprise"}</td>
                <td>{contract.buyerName}</td>
                <td>{contract.outputType}</td>
                <td>{contract.status}</td>
                <td>KES {value.toLocaleString()}</td>
                <td>
                  <div className="inline-actions">
                    {allowedStatuses.map((status) => (
                      <button
                        key={`${contract.id}-${status}`}
                        disabled={busyId === contract.id || status === contract.status}
                        onClick={() => updateStatus(contract.id, status)}
                      >
                        {busyId === contract.id ? "Saving..." : status}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          {!contracts.length && !loading ? (
            <tr>
              <td colSpan={6}>No contracts available for this role yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
