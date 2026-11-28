import type { Metadata } from "next";
import { DashboardPageSkeleton } from "../_components/dashboard-state";
import { Suspense } from "react";
import { ProtectedProfile } from "./protected-profile";

export const metadata: Metadata = { title: "Profil akun · VEKTOR" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton label="Memeriksa sesi akun…" kind="profile" />}>
      <ProtectedProfile />
    </Suspense>
  );
}
