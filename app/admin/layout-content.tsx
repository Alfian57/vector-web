import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { getAccount } from "@/lib/server/auth";
import { accountUnavailablePath, adminPath, adminRequiredPath, signInFor } from "@/lib/routes";
import { AdminShell } from "./shell";

export async function AdminLayoutContent({ children }: { children: ReactNode }) {
  await connection();
  const account = await getAccount(await headers()).catch(() => undefined);
  if (account === undefined) redirect(accountUnavailablePath);
  if (!account) redirect(signInFor(adminPath));
  if (account.role !== "admin") redirect(adminRequiredPath);
  return <AdminShell account={account}>{children}</AdminShell>;
}
