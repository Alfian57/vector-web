import { officerPath } from "@/lib/routes";
import { OfficerRadar } from "./dashboard";
import { OfficerPageBoundary, recordOfficerPage } from "./protected-dashboard";

async function OfficerPageContent() {
  await recordOfficerPage(officerPath);
  return <OfficerRadar />;
}

export default function OfficerPage() {
  return (
    <OfficerPageBoundary kind="officer">
      <OfficerPageContent />
    </OfficerPageBoundary>
  );
}
