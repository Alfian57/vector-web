import { headers } from "next/headers";
import { connection } from "next/server";
import { listAdminAccounts } from "@/lib/server/admin";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { AccountsPanel } from "./panel";
import { tw } from "@/lib/tw";

export default async function AdminAccountsPage({ searchParams }: PageProps<"/admin/accounts">) {
  await connection();
  const account = await getAccount(await headers());
  if (account) await recordPageView(account, "/admin/accounts");
  const query = await searchParams;
  const initialQuery = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const params = new URLSearchParams();
  if (initialQuery) params.set("q", initialQuery);
  const initial = await listAdminAccounts(params);
  return (
    <>
      <header className={tw("admin-heading")}>
        <div>
          <h1>Akun dan akses</h1>
          <p>
            Cari pengguna, atur peran petani atau petugas, dan hentikan akses akun yang perlu ditinjau. Perubahan akses
            akan mengakhiri sesi aktif pengguna.
          </p>
        </div>
      </header>
      <AccountsPanel
        initial={initial.accounts.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
        initialHasMore={initial.hasMore}
        initialQuery={initialQuery}
      />
    </>
  );
}
