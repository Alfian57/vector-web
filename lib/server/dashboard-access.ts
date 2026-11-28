import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AccountRole } from "@/lib/domain";
import {
  accountUnavailablePath,
  adminRequiredPath,
  dashboardForRole,
  officerRequiredPath,
  signInFor,
} from "@/lib/routes";
import { getAccount } from "./auth";
import { unavailable } from "./http";

const currentAccount = cache((requestHeaders: Headers) =>
  getAccount(requestHeaders).catch((error: unknown) => {
    unavailable(error);
    return undefined;
  }),
);

export async function requireDashboardAccount(path: string, role: AccountRole) {
  const account = await currentAccount(await headers());
  if (account === undefined) redirect(accountUnavailablePath);
  if (!account) redirect(signInFor(path));
  if (account.role !== role) {
    if (account.role === "farmer" && role === "admin") redirect(adminRequiredPath);
    if (account.role === "farmer" && role === "officer") redirect(officerRequiredPath);
    redirect(dashboardForRole(account.role));
  }
  return account;
}
