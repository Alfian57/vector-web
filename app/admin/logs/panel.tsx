"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AccountRole, ActivityLog } from "@/lib/domain";
import { ApiError, apiData } from "@/lib/client";
import { activityLogSchema, pageSchema } from "@/lib/api-contracts";
import { DashboardSkeleton, DashboardState } from "@/app/_components/dashboard-state";
import { DataTable } from "@/app/_components/data-table";
import { Pagination } from "@/app/_components/pagination";
import { LogFiltersDialog, type LogFilters } from "./filters-dialog";
import { tw } from "@/lib/tw";
import { dateOnlyToJakartaIso, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";
import { activityActionLabel } from "@/lib/activity-action-label";

const roleLabels: Record<AccountRole, string> = {
  farmer: "Petani",
  officer: "Petugas PPL",
  admin: "Admin",
};

export function LogsPanel({
  initial,
  initialTotalPages,
}: {
  initial: ActivityLog[];
  initialTotalPages?: number;
}) {
  const search = useSearchParams();
  const [logs, setLogs] = useState(initial);
  const rawQuery = search.get("q") ?? "";
  const rawAccount = search.get("account") ?? "";
  const rawKind = search.get("kind") ?? "";
  const rawCategory = search.get("category") ?? "";
  const rawFrom = search.get("from") ?? "";
  const rawTo = search.get("to") ?? "";
  const rawPage = search.get("page");
  const query = rawQuery.trim().slice(0, 100);
  const account = rawAccount.trim().slice(0, 100);
  const kind = rawKind === "audit" || rawKind === "system" ? rawKind : "";
  const categories = new Set(["account", "education", "page", "worker", "auth", "api"]);
  const category = categories.has(rawCategory) ? rawCategory : "";
  const from = dateOnlyToJakartaIso(rawFrom, "start") ? rawFrom : "";
  const to = dateOnlyToJakartaIso(rawTo, "end") ? rawTo : "";
  const page = parsePageIndex(rawPage);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);

  function retry() {
    setIssue("");
    setLoading(true);
    setReload((value) => value + 1);
  }

  function applyFilters(filters: LogFilters) {
    patchBrowserQuery({
      q: filters.query.trim() || null,
      account: filters.account.trim() || null,
      kind: filters.kind || null,
      category: filters.category || null,
      from: filters.from || null,
      to: filters.to || null,
      page: null,
    });
  }

  function clearFilters() {
    patchBrowserQuery({ q: null, account: null, kind: null, category: null, from: null, to: null, page: null });
  }

  useEffect(() => {
    const normalizedPage = pageQueryValue(page);
    if (
      (search.has("q") && !query) ||
      (search.has("account") && !account) ||
      (search.has("kind") && !kind) ||
      (search.has("category") && !category) ||
      (search.has("from") && !from) ||
      (search.has("to") && !to) ||
      rawQuery !== query ||
      rawAccount !== account ||
      rawKind !== kind ||
      rawCategory !== category ||
      rawFrom !== from ||
      rawTo !== to ||
      rawPage !== normalizedPage
    ) {
      patchBrowserQuery({
        q: query || null,
        account: account || null,
        kind: kind || null,
        category: category || null,
        from: from || null,
        to: to || null,
        page: normalizedPage,
      }, "replace");
    }
  }, [account, category, from, kind, page, query, rawAccount, rawCategory, rawFrom, rawKind, rawPage, rawQuery, rawTo, search, to]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    if (account) params.set("account", account);
    if (kind) params.set("kind", kind);
    if (category) params.set("category", category);
    const fromIso = dateOnlyToJakartaIso(from, "start");
    const toIso = dateOnlyToJakartaIso(to, "end");
    if (fromIso) params.set("from", fromIso);
    if (toIso) params.set("to", toIso);
    setIssue("");
    setLoading(true);
    void apiData(`admin/logs?${params}`, pageSchema(activityLogSchema), { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setLogs(result.entries);
        setHasMore(result.hasMore);
        setTotalPages(result.totalPages);
        setIssue("");
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setIssue(error instanceof ApiError ? error.message : "Log belum tersedia.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [page, query, account, kind, category, from, to, reload]);

  useEffect(() => {
    if (totalPages === undefined || page < totalPages) return;
    patchBrowserQuery({ page: pageQueryValue(Math.max(0, totalPages - 1)) }, "replace");
  }, [page, totalPages]);

  return (
    <>
      <div className="dashboard-admin-filter-toolbar">
        <LogFiltersDialog
          filters={{ query, account, kind, category, from, to }}
          onApply={applyFilters}
        />
      </div>
      <section className={tw("admin-panel")} aria-label="Log aktivitas">
        {issue && (
          <DashboardState
            kind="error"
            title="Log belum dapat diperbarui"
            description={issue}
            action={
              <button className={tw("secondary")} onClick={retry}>
                Coba lagi
              </button>
            }
            compact
          />
        )}
        {logs.length ? (
          <DataTable
            label="Log aktivitas"
            columns={["Waktu", "Pelaku", "Peran", "Aksi", "Ringkasan", "Hasil"]}
            busy={loading}
          >
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(log.createdAt),
                  )}
                </td>
                <td>
                  {log.actorName ?? "Sistem"}
                  {!log.actorRole && <small>{log.category}</small>}
                </td>
                <td>{log.actorRole ? roleLabels[log.actorRole] : "—"}</td>
                <td className={tw("admin-log-action")}>{activityActionLabel(log.action, log.category)}</td>
                <td>{log.summary}</td>
                <td>
                  <span
                    className={tw(
                      `admin-badge ${log.outcome === "failure" || log.severity === "error" ? "bad" : "tag-verified"}`,
                    )}
                  >
                    {log.outcome === "success" ? "Berhasil" : "Gagal"}
                  </span>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : loading ? (
          <DashboardSkeleton kind="table" columns={6} label="Memuat log…" />
        ) : !issue && (query || account || kind || category || from || to) ? (
          <DashboardState
            kind="filtered"
            title="Tidak ada aktivitas pada filter ini"
            action={
              <button
                type="button"
                className={tw("secondary")}
                onClick={clearFilters}
              >
                Hapus filter
              </button>
            }
          />
        ) : (
          !issue && <DashboardState title="Belum ada aktivitas" />
        )}
        <Pagination
          label="Halaman log aktivitas"
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
    </>
  );
}
