import { DashboardPageSkeleton } from "../_components/dashboard-state";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { requireDashboardAccount } from "@/lib/server/dashboard-access";
import { officerPath } from "@/lib/routes";
import { OfficerShell } from "./officer-shell";

async function ProtectedLayout({ children }: { children: ReactNode }) {
  await connection();
  const account = await requireDashboardAccount(officerPath, "officer");
  return <OfficerShell account={account}>{children}</OfficerShell>;
}

export default function OfficerLayout({ children }: LayoutProps<"/ppl">) {
  return (
    <Suspense fallback={<DashboardPageSkeleton label="Memeriksa akses PPL…" kind="workspace" />}>
      <ProtectedLayout>
        <Suspense fallback={<DashboardPageSkeleton label="Memuat halaman PPL…" />}>{children}</Suspense>
      </ProtectedLayout>
    </Suspense>
  );
}
