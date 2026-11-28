import { AdminPageBoundary } from "../page-boundary";
import { notFound } from "next/navigation";
import { listAdminAccounts } from "@/lib/server/admin";
import { findAdminAccount } from "@/lib/server/admin-accounts";
import { adminAccountsPath, isAccountRouteId } from "@/lib/routes";
import { recordAdminPage } from "../protected-page";
import { AccountsPanel } from "./panel";
import { tw } from "@/lib/tw";
import { parsePageIndex } from "@/lib/query-state";

const accountRoles = new Set(["farmer", "officer", "admin"]);
const accountStates = new Set(["active", "banned"]);

export default function AdminAccountsPage({ searchParams }: PageProps<"/admin/accounts">) {
  return (
    <AdminPageBoundary label="Memuat akun dan akses…">
      <AdminAccountsContent searchParams={searchParams} />
    </AdminPageBoundary>
  );
}

async function AdminAccountsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/accounts">["searchParams"];
}) {
  await recordAdminPage(adminAccountsPath);
  const query = await searchParams;
  const initialQuery = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const initialRole = typeof query.role === "string" && accountRoles.has(query.role) ? query.role : "";
  const initialState = typeof query.state === "string" && accountStates.has(query.state) ? query.state : "";
  const initialPage = parsePageIndex(typeof query.page === "string" ? query.page : undefined);
  const manageId = typeof query.manage === "string" ? query.manage : "";
  if (manageId && !isAccountRouteId(manageId)) notFound();
  const params = new URLSearchParams();
  if (initialQuery) params.set("q", initialQuery);
  if (initialRole) params.set("role", initialRole);
  if (initialState) params.set("state", initialState);
  if (initialPage) params.set("page", String(initialPage));
  const [initial, selectedAccount] = await Promise.all([
    listAdminAccounts(params),
    manageId ? findAdminAccount(manageId) : Promise.resolve(null),
  ]);
  if (manageId && !selectedAccount) notFound();
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
        key={selectedAccount?.id ?? "list"}
        initial={initial.accounts.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
        initialHasMore={initial.hasMore}
        initialTotalPages={initial.totalPages}
        initialAccessAccount={
          selectedAccount ? { ...selectedAccount, createdAt: selectedAccount.createdAt.toISOString() } : null
        }
      />
    </>
  );
}
