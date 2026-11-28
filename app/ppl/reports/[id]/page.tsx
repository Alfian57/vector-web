import { OfficerPageBoundary } from "../../protected-dashboard";
import { OfficerReportRoute } from "../report-route";

async function OfficerReportPageContent({ params }: PageProps<"/ppl/reports/[id]">) {
  const { id } = await params;
  return <OfficerReportRoute id={id} />;
}

export default function OfficerReportPage({ params }: PageProps<"/ppl/reports/[id]">) {
  return (
    <OfficerPageBoundary kind="review">
      <OfficerReportPageContent params={params} />
    </OfficerPageBoundary>
  );
}
