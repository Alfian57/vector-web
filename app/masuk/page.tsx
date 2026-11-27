import { Suspense } from "react";
import { AuthForm } from "./auth-form";
import { tw } from "@/lib/tw";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className={tw("auth-layout")}>
          <p role="status">Memuat akun…</p>
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
