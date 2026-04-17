import RoleWorkflowPanel from "../components/RoleWorkflowPanel";
import UniversalEnterprisePanel from "../components/UniversalEnterprisePanel";

export default function ConsumerDashboard() {
  return (
    <div className="dashboard">
      <UniversalEnterprisePanel
        title="Consumer Universal Enterprise Dashboard"
        subtitle="Consumers can verify batch history, quality claims, and ledger-backed origin information."
      />
      <RoleWorkflowPanel
        title="Consumer Workflow"
        subtitle="Verify origin and quality claims from scanned batch codes."
        allowedEvents={["verified", "disputed"]}
        defaultEvent="verified"
        enableQrScan
      />
    </div>
  );
}
