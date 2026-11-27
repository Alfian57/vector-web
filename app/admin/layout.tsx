import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/server/auth";
import { accountUnavailablePath, adminPath, adminRequiredPath, signInFor } from "@/lib/routes";
import { AdminShell } from "./shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const account = await getAccount(await headers()).catch(() => undefined);
  if (account === undefined) redirect(accountUnavailablePath);
  if (!account) redirect(signInFor(adminPath));
  if (account.role !== "admin") redirect(adminRequiredPath);
  return <AdminShell name={account.name}>{children}</AdminShell>;
}
