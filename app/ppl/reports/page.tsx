import { officerReportsPath } from "@/lib/routes";
import { OfficerPageBoundary, recordOfficerPage } from "../protected-dashboard";
import { OfficerQueue } from "./queue";

async function OfficerReportsContent() {
  await recordOfficerPage(officerReportsPath);
  return <OfficerQueue />;
}

export default function OfficerReportsPage() {
  return (
    <OfficerPageBoundary kind="table">
      <OfficerReportsContent />
    </OfficerPageBoundary>
  );
}
