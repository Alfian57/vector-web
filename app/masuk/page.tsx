import { Suspense } from "react";
import { AuthForm } from "./auth-form";
import { DashboardSkeleton } from "../_components/dashboard-state";
import { tw } from "@/lib/tw";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className={tw("auth-layout")}>
          <DashboardSkeleton label="Memuat akun…" kind="auth" />
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
