"use client";

import type { ReactNode } from "react";
import type { Account } from "@/lib/domain";
import { disconnectDevicePush } from "@/lib/pwa/push";
import { offlineDb } from "@/lib/pwa/storage";
import { DashboardWorkspace } from "@/app/_components/dashboard-workspace";

export function ProfileWorkspace({ account, children }: { account: Account; children: ReactNode }) {
  async function isDeviceAccount() {
    const saved = await offlineDb()
      .accounts.get("account")
      .catch(() => undefined);
    return saved?.account.id === account.id;
  }

  return (
    <DashboardWorkspace
      account={account}
      beforeSignOut={async () => {
        if (await isDeviceAccount()) await disconnectDevicePush();
      }}
      afterSignOut={async () => {
        const accounts = offlineDb().accounts;
        await accounts.db
          .transaction("rw", accounts, async () => {
            if (await isDeviceAccount()) await accounts.delete("account");
          })
          .catch(() => {});
      }}
    >
      {children}
    </DashboardWorkspace>
  );
}
