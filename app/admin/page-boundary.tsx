import { Suspense, type ReactNode } from "react";
import { DashboardPageSkeleton } from "@/app/_components/dashboard-state";

export function AdminPageBoundary({
  children,
  label,
  kind = "table",
}: {
  children: ReactNode;
  label: string;
  kind?: "table" | "overview";
}) {
  return (
    <Suspense fallback={<DashboardPageSkeleton label={label} kind={kind} />}>
      {children}
    </Suspense>
  );
}
