import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { unavailable } from "@/lib/server/http";
import { accountUnavailablePath, officerPath, officerRequiredPath, signInFor } from "@/lib/routes";
import { Dashboard } from "./dashboard";

export async function ProtectedDashboard() {
  const requestHeaders = await headers();
  const account = await getAccount(requestHeaders).catch((error: unknown) => {
    unavailable(error);
    return undefined;
  });
  if (account === undefined) redirect(accountUnavailablePath);
  if (!account) redirect(signInFor(officerPath));
  if (account.role !== "officer") redirect(officerRequiredPath);
  await recordPageView(account, officerPath);
  return <Dashboard account={account} />;
}
