import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { DashboardSearchEntry } from "@/lib/domain";
import { apiData, errorMessage } from "@/lib/client";
import { dashboardSearchResponseSchema } from "@/lib/api-contracts";

export type DashboardSearchItem = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: LucideIcon;
  href: string;
};

type SearchState = { query: string; entries: DashboardSearchEntry[]; loading: boolean; issue: string };

const emptyState: SearchState = { query: "", entries: [], loading: false, issue: "" };

export function useDashboardGlobalSearch(items: readonly DashboardSearchItem[]) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>(emptyState);
  const [reload, setReload] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const shouldSearch = open && normalizedQuery.length >= 2;
  const matchingItems = useMemo(
    () =>
      items.filter(({ label, description, keywords }) =>
        `${label} ${description} ${keywords}`.toLocaleLowerCase("id-ID").includes(normalizedQuery),
      ),
    [items, normalizedQuery],
  );
  const currentSearch = searchState.query === normalizedQuery;

  useEffect(() => {
    if (!shouldSearch) return;

    let current = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchState({ query: normalizedQuery, entries: [], loading: true, issue: "" });
      void apiData(`search?q=${encodeURIComponent(query.trim())}`, dashboardSearchResponseSchema, {
        signal: controller.signal,
      })
        .then((data) => {
          if (current) setSearchState({ query: normalizedQuery, entries: data.entries, loading: false, issue: "" });
        })
        .catch((cause: unknown) => {
          if (!current) return;
          setSearchState({
            query: normalizedQuery,
            entries: [],
            loading: false,
            issue: errorMessage(cause),
          });
        });
    }, 180);

    return () => {
      current = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, query, shouldSearch, reload]);

  return {
    open,
    setOpen,
    query,
    setQuery,
    matchingItems,
    entries: shouldSearch && currentSearch ? searchState.entries : [],
    loading: shouldSearch && (!currentSearch || searchState.loading),
    issue: shouldSearch && currentSearch ? searchState.issue : "",
    shouldSearch,
    retry: () => {
      setSearchState({ query: normalizedQuery, entries: [], loading: true, issue: "" });
      setReload((value) => value + 1);
    },
  };
}
