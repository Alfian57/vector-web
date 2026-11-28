"use client";

import type { DashboardSearchEntry, DashboardSearchKind } from "@/lib/domain";
import { DashboardSearchDialog, DashboardSearchGroup } from "./dashboard-search-dialog";
import { DashboardSearchResult } from "./dashboard-search-result";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { useDashboardGlobalSearch, type DashboardSearchItem } from "./use-dashboard-global-search";

const groups: Record<DashboardSearchKind, string> = {
  report: "Laporan",
  plot: "Petak pantauan",
  "follow-up": "Tindak lanjut",
  "aid-allocation": "Alokasi bantuan",
  education: "Edukasi",
};

export function DashboardGlobalSearch({ items }: { items: readonly DashboardSearchItem[] }) {
  const { open, setOpen, query, setQuery, matchingItems, entries, loading, issue, shouldSearch, retry } =
    useDashboardGlobalSearch(items);
  const grouped = new Map<DashboardSearchKind, DashboardSearchEntry[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.kind) ?? [];
    group.push(entry);
    grouped.set(entry.kind, group);
  }
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }
  const close = () => changeOpen(false);

  return (
    <DashboardSearchDialog
      title="Pencarian menu dashboard"
      open={open}
      query={query}
      onOpenChange={changeOpen}
      onQueryChange={setQuery}
    >
      {!!matchingItems.length && (
        <DashboardSearchGroup title="Menu dan fitur">
          {matchingItems.map((item) => (
            <li key={item.id}>
              <DashboardSearchResult item={item} onActivate={close} />
            </li>
          ))}
        </DashboardSearchGroup>
      )}
      {[...grouped].map(([kind, group]) => (
        <DashboardSearchGroup key={kind} title={groups[kind]}>
          {group.map((item) => (
            <li key={item.id}>
              <DashboardSearchResult item={item} onActivate={close} />
            </li>
          ))}
        </DashboardSearchGroup>
      ))}
      {loading && <DashboardSkeleton label="Mencari data…" kind="list" rows={2} />}
      {issue && (
        <DashboardState
          compact
          kind="error"
          title="Pencarian data belum tersedia"
          description={issue}
          action={
            <button className="dashboard-inline-link" onClick={retry}>
              Coba lagi
            </button>
          }
        />
      )}
      {shouldSearch && !loading && !issue && !matchingItems.length && !entries.length && (
        <DashboardState kind="filtered" title="Tidak ada hasil" description="Coba kata kunci yang lain." compact />
      )}
      {!shouldSearch && <p className="dashboard-search-hint">Ketik sedikitnya 2 karakter untuk mencari data.</p>}
    </DashboardSearchDialog>
  );
}
