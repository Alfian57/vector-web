import { Suspense } from "react";
import { Brand } from "../_components/brand";
import { ProtectedDashboard } from "./protected-dashboard";
import { tw } from "@/lib/tw";

export default function OfficerPage() {
  return (
    <Suspense
      fallback={
        <main className={tw("auth-layout")}>
          <Brand />
          <p role="status">Memeriksa akses PPL…</p>
        </main>
      }
    >
      <ProtectedDashboard />
    </Suspense>
  );
}
