import { Suspense, type ReactNode } from "react";
import { DashboardPageSkeleton } from "../_components/dashboard-state";
import { requireDashboardAccount } from "@/lib/server/dashboard-access";
import { recordPageView } from "@/lib/server/activity-log";

export function OfficerPageBoundary({
  children,
  kind = "table",
}: {
  children: ReactNode;
  kind?: "map" | "officer" | "table" | "form" | "review" | "allocation";
}) {
  return (
    <Suspense fallback={<DashboardPageSkeleton label="Memeriksa akses PPL…" kind={kind} />}>
      {children}
    </Suspense>
  );
}

export async function recordOfficerPage(path: string, auditPath = path) {
  const account = await requireDashboardAccount(path, "officer");
  await recordPageView(account, auditPath);
}
