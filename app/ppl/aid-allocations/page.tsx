import { officerAidPath } from "@/lib/routes";
import { AidPanel } from "../aid-panel";
import { OfficerPageBoundary, recordOfficerPage } from "../protected-dashboard";

async function OfficerAidContent() {
  await recordOfficerPage(officerAidPath);
  return <AidPanel />;
}

export default function OfficerAidPage() {
  return (
    <OfficerPageBoundary kind="table">
      <OfficerAidContent />
    </OfficerPageBoundary>
  );
}
