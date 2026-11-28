"use client";

import { DashboardSkeleton, DashboardState } from "@/app/_components/dashboard-state";
import { DataTable } from "@/app/_components/data-table";
import { ActionIcon } from "@/app/_components/action-icon";
import { Pagination } from "@/app/_components/pagination";
import { AccountFiltersDialog } from "./filters-dialog";
import { AccountAccessDialog } from "./access-dialog";
import type { UserRow } from "./types";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, apiData } from "@/lib/client";
import { adminAccountsResponseSchema } from "@/lib/api-contracts";
import { tw } from "@/lib/tw";
import { pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

const rolePresentation: Record<string, { label: string; tone: "farmer" | "officer" | "admin" }> = {
  farmer: { label: "Petani", tone: "farmer" },
  officer: { label: "Petugas PPL", tone: "officer" },
  admin: { label: "Admin", tone: "admin" },
};
const accountRoles = new Set(Object.keys(rolePresentation));
const accountStates = new Set(["active", "banned"]);

function AccountRoleBadge({ role }: { role: string }) {
  const presentation = rolePresentation[role] ?? rolePresentation.admin;

  return (
    <span className={`${tw("admin-badge")} dashboard-account-role-badge--${presentation.tone}`}>
      {presentation.label}
    </span>
  );
}

export function AccountsPanel({
  initial,
  initialHasMore,
  initialTotalPages,
  initialAccessAccount = null,
}: {
  initial: UserRow[];
  initialHasMore: boolean;
  initialTotalPages?: number;
  initialAccessAccount?: UserRow | null;
}) {
  const search = useSearchParams();
  const [accounts, setAccounts] = useState(initial);
  const rawQuery = search.get("q") ?? "";
  const rawRole = search.get("role") ?? "";
  const rawState = search.get("state") ?? "";
  const rawPage = search.get("page");
  const query = rawQuery.trim().slice(0, 100);
  const role = accountRoles.has(rawRole) ? rawRole : "";
  const state = accountStates.has(rawState) ? rawState : "";
  const page = parsePageIndex(rawPage);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [selectedAccount, setSelectedAccount] = useState<UserRow | null>(initialAccessAccount);

  useEffect(() => {
    const id = search.get("manage");
    if (!id) {
      setSelectedAccount(null);
      return;
    }
    const account = accounts.find((entry) => entry.id === id);
    if (account) setSelectedAccount(account);
  }, [accounts, search]);

  useEffect(() => {
    const normalizedPage = pageQueryValue(page);
    if (
      (search.has("q") && !query) ||
      (search.has("role") && !role) ||
      (search.has("state") && !state) ||
      rawQuery !== query ||
      rawRole !== role ||
      rawState !== state ||
      rawPage !== normalizedPage
    ) {
      patchBrowserQuery({
        q: query || null,
        role: role || null,
        state: state || null,
        page: normalizedPage,
      }, "replace");
    }
  }, [page, query, rawPage, rawQuery, rawRole, rawState, role, search, state]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (role) params.set("role", role);
    if (state) params.set("state", state);
    params.set("page", String(page));
    setError("");
    setLoading(true);
    void apiData(`admin/accounts?${params}`, adminAccountsResponseSchema, { signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        setAccounts(value.accounts);
        setHasMore(value.hasMore);
        setTotalPages(value.totalPages);
        setError("");
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof ApiError ? cause.message : "Daftar akun belum tersedia.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [query, role, state, page, reloadKey]);

  useEffect(() => {
    if (totalPages === undefined || page < totalPages) return;
    patchBrowserQuery({ page: pageQueryValue(Math.max(0, totalPages - 1)) }, "replace");
  }, [page, totalPages]);

  function reload() {
    setLoading(true);
    setError("");
    setReloadKey((value) => value + 1);
  }

  function clearFilters() {
    patchBrowserQuery({ q: null, role: null, state: null, page: null });
  }

  function openAccessDialog(user: UserRow) {
    setSelectedAccount(user);
    patchBrowserQuery({ manage: user.id });
  }

  function closeAccessDialog() {
    setSelectedAccount(null);
    patchBrowserQuery({ manage: null }, "replace");
  }

  function updateAccount(updated: UserRow) {
    setAccounts((current) => current.map((account) => (account.id === updated.id ? updated : account)));
    setSelectedAccount(updated);
    reload();
  }

  return (
    <>
      <div className={tw("action-row")}>
        <AccountFiltersDialog
          filters={{ query, role, state }}
          onApply={(filters) => {
            patchBrowserQuery({
              q: filters.query || null,
              role: filters.role || null,
              state: filters.state || null,
              page: null,
            });
          }}
        />
      </div>
      <section className={tw("admin-panel")} aria-label="Akun dan akses">
        {error && (
          <DashboardState
            compact
            kind="error"
            title="Daftar akun belum dapat diperbarui"
            description={error}
            action={
              <button className={tw("secondary")} onClick={reload}>
                Coba lagi
              </button>
            }
          />
        )}
        {accounts.length ? (
          <DataTable
            label="Akun dan akses"
            columns={["Pengguna", "Email", "Nomor telepon", "Peran", "Status", "Aksi"]}
            busy={loading}
          >
            {accounts.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                </td>
                <td>{user.email || "—"}</td>
                <td>{user.phoneNumber || "—"}</td>
                <td>
                  <AccountRoleBadge role={user.role} />
                </td>
                <td>
                  <span className={tw(`admin-badge ${user.banned ? "bad" : "tag-verified"}`)}>
                    {user.banned ? "Dinonaktifkan" : "Aktif"}
                  </span>
                  {user.banned && user.banReason && <small>Alasan: {user.banReason}</small>}
                </td>
                <td>
                  <ActionIcon
                    onClick={() => openAccessDialog(user)}
                    label="Kelola akses"
                    icon="user"
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : loading ? (
          <DashboardSkeleton kind="table" columns={6} label="Memuat akun…" />
        ) : !error && (query || role || state) ? (
          <DashboardState
            kind="filtered"
            title="Tidak ada akun yang cocok"
            action={
              <button type="button" className={tw("secondary")} onClick={clearFilters}>
                Hapus filter
              </button>
            }
          />
        ) : (
          !error && <DashboardState title="Belum ada akun" />
        )}
        <Pagination
          label="Halaman akun"
          page={page}
          hasNext={hasMore}
          totalPages={totalPages}
          busy={loading}
          onPage={(nextPage) => {
            setLoading(true);
            patchBrowserQuery({ page: pageQueryValue(nextPage) });
          }}
        />
      </section>
      <AccountAccessDialog user={selectedAccount} onClose={closeAccessDialog} onUpdated={updateAccount} />
    </>
  );
}
