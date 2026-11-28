import { DashboardPageSkeleton } from "../_components/dashboard-state";
import { Suspense } from "react";
import { AdminLayoutContent } from "./layout-content";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<DashboardPageSkeleton label="Memeriksa akses Admin…" kind="table" />}>
      <AdminLayoutContent>
        <Suspense fallback={<DashboardPageSkeleton label="Memuat halaman Admin…" />}>{children}</Suspense>
      </AdminLayoutContent>
    </Suspense>
  );
}
