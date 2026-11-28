import { Suspense } from "react";
import { DashboardPageSkeleton } from "../../../../_components/dashboard-state";
import { RadarContent } from "../../../radar-content";

async function EditReportRoute({ params }: PageProps<"/radar/reports/[id]/edit">) {
  const { id } = await params;
  return <RadarContent screen={{ section: "edit", id }} />;
}

export default function RadarReportEditPage(props: PageProps<"/radar/reports/[id]/edit">) {
  return (
    <Suspense fallback={<DashboardPageSkeleton label="Memuat laporan lokal…" kind="report-form" />}>
      <EditReportRoute {...props} />
    </Suspense>
  );
}
