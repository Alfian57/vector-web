import { OfficerPageBoundary } from "../../../protected-dashboard";
import { OfficerReportRoute } from "../../report-route";

async function CorrectReportPageContent({ params }: PageProps<"/ppl/reports/[id]/correct">) {
  const { id } = await params;
  return <OfficerReportRoute id={id} correcting />;
}

export default function CorrectReportPage({ params }: PageProps<"/ppl/reports/[id]/correct">) {
  return (
    <OfficerPageBoundary kind="review">
      <CorrectReportPageContent params={params} />
    </OfficerPageBoundary>
  );
}
