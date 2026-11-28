"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, apiData } from "@/lib/client";
import { reportPageResponseSchema } from "@/lib/api-contracts";
import { accountUnavailablePath, signInFor } from "@/lib/routes";
import type { Report } from "@/lib/domain";
import { offlineDb, type QueuedReport } from "@/lib/pwa/storage";
import { scheduleReports, syncReports } from "@/lib/pwa/sync";
import { useRadarSession } from "./use-radar-session";
import { readReportFilters, type ReportFilters } from "./report-filters";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

function subscribeToNetwork(update: () => void) {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

export function useFarmerWorkspace(destination: string, showReports: boolean) {
  const online = useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true,
  );
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [sent, setSent] = useState(0);
  const [reports, setReports] = useState<Report[]>();
  const reportFilters = readReportFilters(destination);
  const search = new URL(destination, "https://vektor.invalid").searchParams;
  const rawPage = search.get("page");
  const rawStatus = search.get("status");
  const rawFinding = search.get("finding");
  const page = parsePageIndex(rawPage);
  const [more, setMore] = useState(false);
  const [totalPages, setTotalPages] = useState<number>();
  const [message, setMessage] = useState("");
  const [listIssue, setListIssue] = useState(false);
  const [queueReady, setQueueReady] = useState(false);
  const [queueIssue, setQueueIssue] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [discard, setDiscard] = useState<string>();
  const [discarding, setDiscarding] = useState(false);
  const [discardIssue, setDiscardIssue] = useState("");
  const [reportsLoading, setReportsLoading] = useState(false);
  const reportRequest = useRef<AbortController>(null);
  const leaving = useRef(false);

  const resetOwner = useCallback(() => {
    setQueue([]);
    setReports(undefined);
    setMessage("");
    setSent(0);
    setMore(false);
    setTotalPages(undefined);
    setListIssue(false);
    setQueueReady(false);
    setQueueIssue(false);
    setDiscard(undefined);
    setDiscardIssue("");
    reportRequest.current?.abort();
  }, []);
  const {
    account,
    accountId: accountIdRef,
    sessionIssue,
    loadSession,
    clearSession: clearDeviceSession,
  } = useRadarSession(resetOwner);

  const loadQueue = useCallback(
    async (ownerId: string) => {
      const database = offlineDb();
      const [items, count] = await Promise.all([
        database.queue.where("ownerId").equals(ownerId).toArray(),
        database.sent.where("ownerId").equals(ownerId).count(),
      ]);
      if (accountIdRef.current !== ownerId) return;
      setQueue(items.sort((first, second) => second.report.observedAt.localeCompare(first.report.observedAt)));
      setSent(count);
      setQueueReady(true);
      setQueueIssue(false);
    },
    [accountIdRef],
  );

  const loadReports = useCallback(
    async (nextPage: number, filters: ReportFilters = reportFilters) => {
      if (account?.role !== "farmer") return;
      const ownerId = accountIdRef.current;
      if (!ownerId) return;
      reportRequest.current?.abort();
      const controller = new AbortController();
      reportRequest.current = controller;
      const { signal } = controller;
      setListIssue(false);
      setReportsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(nextPage) });
        if (filters.status) params.set("status", filters.status);
        if (filters.finding) params.set("finding", filters.finding);
        const value = await apiData(`reports?${params}`, reportPageResponseSchema, {
          headers: { "x-vektor-account": ownerId },
          signal,
        });
        if (signal.aborted || accountIdRef.current !== ownerId) return;
        setReports(value.reports);
        setMore(value.hasMore);
        setTotalPages(value.totalPages);
      } catch (error) {
        if (signal.aborted || accountIdRef.current !== ownerId) return;
        if (error instanceof ApiError && error.status === 401) void loadSession();
        else setListIssue(true);
      } finally {
        if (!signal.aborted && accountIdRef.current === ownerId) setReportsLoading(false);
      }
    },
    [account?.role, accountIdRef, destination, loadSession],
  );

  const applyReportFilters = useCallback(
    (filters: ReportFilters) => {
      patchBrowserQuery({
        status: filters.status || null,
        finding: filters.finding || null,
        page: null,
      });
    },
    [],
  );

  useEffect(() => {
    if (showReports && online) void loadReports(page, reportFilters);
  }, [destination, loadReports, online, page, reportFilters.finding, reportFilters.status, showReports]);

  useEffect(() => {
    const normalizedStatus = reportFilters.status || null;
    const normalizedFinding = reportFilters.finding || null;
    if (rawStatus !== normalizedStatus || rawFinding !== normalizedFinding) {
      patchBrowserQuery({ status: normalizedStatus, finding: normalizedFinding }, "replace");
    }
  }, [destination, rawFinding, rawStatus, reportFilters.finding, reportFilters.status]);

  useEffect(() => {
    normalizeBrowserPage("page", rawPage, page);
  }, [page, rawPage]);

  useEffect(() => {
    if (totalPages === undefined) return;
    normalizeBrowserPage("page", rawPage, totalPages > 0 ? Math.min(page, totalPages - 1) : 0);
  }, [page, rawPage, totalPages]);

  const sync = useCallback(
    async (ownerId: string, currentPage = page) => {
      setSyncing(true);
      try {
        await scheduleReports();
        await syncReports().catch(() => {});
        await Promise.all([loadQueue(ownerId), showReports ? loadReports(currentPage) : undefined]);
      } catch {
        if (accountIdRef.current === ownerId) setMessage("Antrean perangkat belum dapat dibuka.");
      } finally {
        setSyncing(false);
      }
    },
    [accountIdRef, loadQueue, loadReports, page, showReports],
  );

  useEffect(() => {
    const connected = () => {
      void loadSession().then((user) => {
        if (user?.role === "farmer") void sync(user.id);
      });
    };
    connected();
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) connected();
    };
    window.addEventListener("online", connected);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", connected);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadSession, sync]);

  useEffect(() => () => reportRequest.current?.abort(), []);

  const ownerId = account?.id;
  useEffect(() => {
    if (account?.role !== "farmer" || !ownerId) return;
    const update = () => {
      void loadQueue(ownerId).catch(() => {
        if (accountIdRef.current === ownerId) setQueueIssue(true);
      });
      if (showReports && navigator.onLine) void loadReports(page);
    };
    const onWorker = (event: MessageEvent) => {
      if (event.data === "vektor-queue-changed") update();
    };
    update();
    navigator.serviceWorker?.addEventListener("message", onWorker);
    return () => navigator.serviceWorker?.removeEventListener("message", onWorker);
  }, [account?.role, ownerId, accountIdRef, loadQueue, loadReports, page, showReports]);

  useEffect(() => {
    if (account || !online || leaving.current) return;
    if (sessionIssue) window.location.replace(accountUnavailablePath);
    else if (account === null) window.location.replace(signInFor(destination));
  }, [account, online, destination, sessionIssue]);

  async function clearSession() {
    leaving.current = true;
    await clearDeviceSession();
  }

  const cancelDiscard = useCallback(() => {
    setDiscard(undefined);
    setDiscardIssue("");
  }, []);
  const discardReport = useCallback((id: string) => setDiscard(id), []);

  const confirmDiscard = useCallback(async () => {
    if (account?.role !== "farmer" || !discard || discarding) return;
    setDiscarding(true);
    setDiscardIssue("");
    try {
      const database = offlineDb();
      await database.transaction("rw", database.queue, database.accounts, async () => {
        const [item, active] = await Promise.all([database.queue.get(discard), database.accounts.get("account")]);
        if (item?.ownerId === account.id && active?.account.id === account.id) await database.queue.delete(discard);
      });
      await loadQueue(account.id);
      setDiscard(undefined);
    } catch {
      setDiscardIssue("Laporan belum dapat dihapus.");
    } finally {
      setDiscarding(false);
    }
  }, [account, discard, discarding, loadQueue]);

  const retrySession = useCallback(async () => {
    const user = await loadSession();
    if (user?.role === "farmer") void sync(user.id);
  }, [loadSession, sync]);

  const syncCurrentPage = useCallback(() => {
    if (account?.role === "farmer") void sync(account.id, page);
  }, [account, page, sync]);

  return {
    account,
    online,
    sessionIssue,
    loadSession,
    clearSession,
    queue,
    queueReady,
    queueIssue,
    sent,
    reports,
    reportFilters,
    reportsLoading,
    page,
    more,
    totalPages,
    message,
    listIssue,
    syncing,
    discard,
    discarding,
    discardIssue,
    loadReports,
    applyReportFilters,
    sync,
    syncCurrentPage,
    discardReport,
    cancelDiscard,
    confirmDiscard,
    retrySession,
  };
}
