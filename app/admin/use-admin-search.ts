"use client";

import { useEffect, useState } from "react";
import type { AdminSearchResults } from "@/lib/domain";
import { ApiError, apiData } from "@/lib/client";
import { adminSearchResultsSchema } from "@/lib/api-contracts";

const emptyResults: AdminSearchResults = { accounts: [], education: [], logs: [] };

export function useAdminSearch(open: boolean, query: string) {
  const [searchState, setSearchState] = useState({ query: "", results: emptyResults, loading: false, issue: "" });
  const [reload, setReload] = useState(0);
  const searchTerm = query.trim();
  const shouldSearch = open && searchTerm.length >= 2;

  useEffect(() => {
    if (!shouldSearch) return;

    let current = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchState({ query: searchTerm, results: emptyResults, loading: true, issue: "" });
      void apiData(`admin/search?q=${encodeURIComponent(searchTerm)}`, adminSearchResultsSchema, {
        signal: controller.signal,
      })
        .then((data) => {
          if (current) setSearchState({ query: searchTerm, results: data, loading: false, issue: "" });
        })
        .catch((cause: unknown) => {
          if (current)
            setSearchState({
              query: searchTerm,
              results: emptyResults,
              loading: false,
              issue: cause instanceof ApiError ? cause.message : "Pencarian belum dapat dimuat.",
            });
        });
    }, 180);
    return () => {
      current = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, shouldSearch, reload]);

  const isCurrentSearch = searchState.query === searchTerm;
  return {
    results: shouldSearch && isCurrentSearch ? searchState.results : emptyResults,
    loading: shouldSearch && (!isCurrentSearch || searchState.loading),
    issue: shouldSearch && isCurrentSearch ? searchState.issue : "",
    retry: () => {
      setSearchState({ query: searchTerm, results: emptyResults, loading: true, issue: "" });
      setReload((value) => value + 1);
    },
  };
}
