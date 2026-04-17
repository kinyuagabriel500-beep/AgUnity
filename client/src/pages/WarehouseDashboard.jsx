import RoleWorkflowPanel from "../components/RoleWorkflowPanel";
import UniversalEnterprisePanel from "../components/UniversalEnterprisePanel";

export default function WarehouseDashboard() {
  return (
    <div className="dashboard">
      <UniversalEnterprisePanel
        title="Warehouse Universal Enterprise Dashboard"
        subtitle="Warehouse users see the same enterprise model plus batch verification and chain-of-custody context."
      />
      <RoleWorkflowPanel
        title="Warehouse Workflow"
        subtitle="Confirm receipt, storage, and inventory readiness for incoming batches."
        allowedEvents={["received"]}
        defaultEvent="received"
        enableQrScan
      />
    </div>
  );
}
