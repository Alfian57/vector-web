import type { ReactNode } from "react";
import type { Account } from "@/lib/domain";
import { DashboardWorkspace } from "../_components/dashboard-workspace";

export function AdminShell({ account, children }: { account: Account; children: ReactNode }) {
  return (
    <DashboardWorkspace account={account} workspace="admin">
      {children}
    </DashboardWorkspace>
  );
}
