import { accountUnavailablePath, officerPath, officerRequiredPath, signInFor } from "@/lib/routes";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { unavailable } from "@/lib/server/http";
import { Brand } from "../_components/brand";
import { Dashboard } from "./dashboard";

async function ProtectedDashboard() {
  const requestHeaders = await headers();
  const account = await getAccount(requestHeaders).catch((error: unknown) => {
    unavailable(error);
    return undefined;
  });
  if (account === undefined) redirect(accountUnavailablePath);
  if (!account) redirect(signInFor(officerPath));
  if (account.role !== "officer") redirect(officerRequiredPath);
  await recordPageView(account, officerPath);
  return <Dashboard name={account.name} whatsappLinked={account.whatsappLinked === true} />;
}

export default function OfficerPage() {
  return <Suspense fallback={<main className="auth-layout"><Brand /><p role="status">Memeriksa akses PPL…</p></main>}>
    <ProtectedDashboard />
  </Suspense>;
}
