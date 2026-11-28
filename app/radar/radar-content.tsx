import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireDashboardAccount } from "@/lib/server/dashboard-access";
import { recordPageView } from "@/lib/server/activity-log";
import { uuid } from "@/lib/domain";
import { radarReportEditPath, radarReportsPath, radarSectionPath, type RadarScreen } from "@/lib/routes";
import { DashboardPageSkeleton } from "../_components/dashboard-state";
import { FarmerApp } from "../_components/farmer-app";

async function ProtectedRadar({ screen }: { screen: RadarScreen }) {
  if (screen.section === "edit" && !uuid.safeParse(screen.id).success) notFound();
  const path = screen.section === "edit" ? radarReportEditPath(screen.id) : radarSectionPath(screen.section);
  const account = await requireDashboardAccount(path, "farmer");
  await recordPageView(account, screen.section === "edit" ? `${radarReportsPath}/[id]/edit` : path);
  return <FarmerApp initialScreen={screen} />;
}

export function RadarContent({ screen }: { screen: RadarScreen }) {
  return (
    <Suspense
      fallback={
        <DashboardPageSkeleton
          label="Memeriksa sesi akun…"
          kind={screen.section === "radar" ? "map" : screen.section === "edit" ? "form" : "table"}
        />
      }
    >
      <ProtectedRadar screen={screen} />
    </Suspense>
  );
}
