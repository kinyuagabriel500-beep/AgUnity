import RoleWorkflowPanel from "../components/RoleWorkflowPanel";
import UniversalEnterprisePanel from "../components/UniversalEnterprisePanel";

export default function TransporterDashboard() {
  return (
    <div className="dashboard">
      <UniversalEnterprisePanel
        title="Transporter Universal Enterprise Dashboard"
        subtitle="Track batches, verify origin, and see enterprise supply-chain context."
      />
      <RoleWorkflowPanel
        title="Transporter Workflow"
        subtitle="Record farm handoff events and track transport-stage batches."
        allowedEvents={["handoff"]}
        defaultEvent="handoff"
      />
    </div>
  );
}
