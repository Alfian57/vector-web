import { officerFollowUpsPath } from "@/lib/routes";
import { ActionsPanel } from "../actions-panel";
import { OfficerPageBoundary, recordOfficerPage } from "../protected-dashboard";

async function FollowUpsContent() {
  await recordOfficerPage(officerFollowUpsPath);
  return <ActionsPanel />;
}

export default function FollowUpsPage() {
  return (
    <OfficerPageBoundary kind="table">
      <FollowUpsContent />
    </OfficerPageBoundary>
  );
}
