import RoleWorkflowPanel from "../components/RoleWorkflowPanel";
import UniversalEnterprisePanel from "../components/UniversalEnterprisePanel";
import ContractActionPanel from "../components/ContractActionPanel";

export default function RetailerDashboard() {
  return (
    <div className="dashboard">
      <UniversalEnterprisePanel
        title="Retailer Universal Enterprise Dashboard"
        subtitle="Verified supply chains, enterprise templates, and contract-driven sales in one place."
      />
      <RoleWorkflowPanel
        title="Retailer Workflow"
        subtitle="List verified batches and finalize settlements with payment proof."
        allowedEvents={["listed", "settled"]}
        defaultEvent="listed"
      />
      <ContractActionPanel role="retailer" />
    </div>
  );
}
