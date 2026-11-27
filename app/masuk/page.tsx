import { Suspense } from "react";
import { AuthForm } from "./auth-form";

export default function SignInPage() {
  return <Suspense fallback={<main className="auth-layout"><p role="status">Memuat akun…</p></main>}><AuthForm /></Suspense>;
}
