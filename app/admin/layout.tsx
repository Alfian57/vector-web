import { Suspense } from "react";
import { AdminLayoutContent } from "./layout-content";
import { tw } from "@/lib/tw";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <main className={tw("admin-content")}>
          <p role="status">Memeriksa akses Admin…</p>
        </main>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
