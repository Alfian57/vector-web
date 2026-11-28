"use client";

import { useEffect, useMemo, type Key, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { z } from "zod";
import { pageSchema } from "@/lib/api-contracts";
import { DashboardSkeleton, DashboardState } from "../_components/dashboard-state";
import { DataTable } from "../_components/data-table";
import { Pagination } from "../_components/pagination";
import { useOfficerData } from "./use-ppl-dashboard";
import { tw } from "@/lib/tw";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

export type HistoryEntriesProps<T> = {
  label: string;
  columns: readonly string[];
  path: string;
  pageParam?: string;
  revision?: number;
  schema: z.ZodType<T>;
  entryKey: (entry: T) => Key;
  renderEntry: (entry: T) => ReactNode;
};

export function StaffHistoryEntries<T>({
  label,
  columns,
  path,
  pageParam = "historyPage",
  revision,
  schema,
  entryKey,
  renderEntry,
}: HistoryEntriesProps<T>) {
  const search = useSearchParams();
  const rawPage = search.get(pageParam);
  const page = parsePageIndex(rawPage);
  const responseSchema = useMemo(() => pageSchema(schema), [schema]);
  const separator = path.includes("?") ? "&" : "?";
  const { data, issue, retry, loading } = useOfficerData(`${path}${separator}page=${page}`, responseSchema, revision);
  const currentPage =
    data?.totalPages === undefined ? page : data.totalPages > 0 ? Math.min(page, data.totalPages - 1) : 0;

  useEffect(() => {
    normalizeBrowserPage(pageParam, rawPage, page);
  }, [page, pageParam, rawPage]);

  useEffect(() => {
    if (data) normalizeBrowserPage(pageParam, rawPage, currentPage);
  }, [currentPage, data, pageParam, rawPage]);

  return (
    <>
      {issue && (
        <DashboardState
          compact
          kind="error"
          title="Data belum dapat diperbarui"
          description={issue}
          action={
            <button className={tw("secondary")} onClick={retry}>
              Coba lagi
            </button>
          }
        />
      )}
      {data?.entries.length ? (
        <DataTable label={label} columns={columns} busy={loading}>
          {data.entries.map((entry) => (
            <tr key={entryKey(entry)}>{renderEntry(entry)}</tr>
          ))}
        </DataTable>
      ) : loading ? (
        <DashboardSkeleton kind="table" columns={columns.length} label="Memuat riwayat…" />
      ) : (
        !issue && (
          <DashboardState title="Riwayat masih kosong" description="Perubahan yang disimpan akan tercatat di sini." />
        )
      )}
      <Pagination
        label={`Halaman ${label.toLocaleLowerCase("id-ID")}`}
        page={currentPage}
        hasNext={data?.hasMore ?? false}
        totalPages={data?.totalPages}
        busy={loading}
        onPage={(nextPage) => patchBrowserQuery({ [pageParam]: pageQueryValue(nextPage) })}
      />
    </>
  );
}
