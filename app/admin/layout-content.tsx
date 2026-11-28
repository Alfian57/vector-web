import type { ReactNode } from "react";
import { connection } from "next/server";
import { requireDashboardAccount } from "@/lib/server/dashboard-access";
import { adminPath } from "@/lib/routes";
import { AdminShell } from "./shell";

export async function AdminLayoutContent({ children }: { children: ReactNode }) {
  await connection();
  const account = await requireDashboardAccount(adminPath, "admin");
  return <AdminShell account={account}>{children}</AdminShell>;
}
