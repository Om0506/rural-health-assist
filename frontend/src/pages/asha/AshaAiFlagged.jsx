import AshaFlaggedCasesPanel from '../../components/asha/AshaFlaggedCasesPanel';

export default function AshaAiFlagged() {
  return (
    <div className="page-container dashboard-stack">
      <AshaFlaggedCasesPanel
        showCreateButton
        title="Flagged Cases"
        description="Use the filters to review AI triage, doctor escalations, active cases, and resolved follow-ups from one queue."
      />
    </div>
  );
}
