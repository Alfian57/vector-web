"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ApiError, apiData } from "@/lib/client";
import { reportPageResponseSchema } from "@/lib/api-contracts";
import { accountUnavailablePath, radarSectionPath, signInFor, type RadarSection } from "@/lib/routes";
import type { Report } from "@/lib/domain";
import { offlineDb, type QueuedReport } from "@/lib/pwa/storage";
import { scheduleReports, syncReports } from "@/lib/pwa/sync";
import { useRadarSession } from "./use-radar-session";

function subscribeToNetwork(update: () => void) {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

export function useFarmerWorkspace(section: RadarSection) {
  const online = useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true,
  );
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [sent, setSent] = useState(0);
  const [reports, setReports] = useState<Report[]>();
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState("");
  const [listIssue, setListIssue] = useState(false);
  const [edit, setEdit] = useState<QueuedReport>();
  const [syncing, setSyncing] = useState(false);
  const [discard, setDiscard] = useState<string>();

  const resetOwner = useCallback(() => {
    setQueue([]);
    setReports(undefined);
    setSent(0);
    setPage(0);
    setMore(false);
    setListIssue(false);
    setEdit(undefined);
    setDiscard(undefined);
  }, []);
  const { account, accountId: accountIdRef, sessionIssue, loadSession, clearSession } = useRadarSession(resetOwner);

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
    },
    [accountIdRef],
  );

  const loadReports = useCallback(
    async (nextPage: number) => {
      const ownerId = accountIdRef.current;
      if (!ownerId) return;
      try {
        const value = await apiData(`reports?page=${nextPage}`, reportPageResponseSchema, {
          headers: { "x-vektor-account": ownerId },
        });
        if (accountIdRef.current !== ownerId) return;
        setReports(value.reports);
        setMore(value.hasMore);
        setPage(nextPage);
        setListIssue(false);
      } catch (error) {
        if (accountIdRef.current !== ownerId) return;
        if (error instanceof ApiError && error.status === 401) void loadSession();
        else setListIssue(true);
      }
    },
    [accountIdRef, loadSession],
  );

  const sync = useCallback(
    async (ownerId: string, currentPage = 0) => {
      setSyncing(true);
      try {
        await scheduleReports();
        await syncReports().catch(() => {});
        await Promise.all([loadQueue(ownerId), loadReports(currentPage)]);
      } catch {
        setMessage("Antrean perangkat belum dapat dibuka.");
      } finally {
        setSyncing(false);
      }
    },
    [loadQueue, loadReports],
  );

  useEffect(() => {
    const connected = () => {
      void loadSession().then((user) => {
        if (user) void sync(user.id);
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

  const ownerId = account?.id;
  useEffect(() => {
    if (!ownerId) return;
    const update = () => {
      void loadQueue(ownerId).catch(() => {});
      if (navigator.onLine) void loadReports(0);
    };
    const onWorker = (event: MessageEvent) => {
      if (event.data === "vektor-queue-changed") update();
    };
    update();
    navigator.serviceWorker?.addEventListener("message", onWorker);
    return () => navigator.serviceWorker?.removeEventListener("message", onWorker);
  }, [ownerId, loadQueue, loadReports]);

  useEffect(() => {
    if (account || !online) return;
    if (sessionIssue) window.location.replace(accountUnavailablePath);
    else if (account === null) window.location.replace(signInFor(radarSectionPath(section)));
  }, [account, online, section, sessionIssue]);

  const clearMessage = useCallback(() => setMessage(""), []);
  const clearEdit = useCallback(() => setEdit(undefined), []);
  const editReport = useCallback((report: QueuedReport) => setEdit(report), []);
  const cancelDiscard = useCallback(() => setDiscard(undefined), []);
  const discardReport = useCallback((id: string) => setDiscard(id), []);

  const confirmDiscard = useCallback(async () => {
    if (!account || !discard) return;
    try {
      await offlineDb().queue.delete(discard);
      await loadQueue(account.id);
      setDiscard(undefined);
    } catch {
      setMessage("Laporan belum dapat dihapus.");
    }
  }, [account, discard, loadQueue]);

  const reportSaved = useCallback(() => {
    if (!account) return;
    setMessage("Laporan tersimpan di perangkat.");
    void loadQueue(account.id)
      .then(() => {
        if (navigator.onLine) void sync(account.id);
        else void scheduleReports();
      })
      .catch(() => {});
  }, [account, loadQueue, sync]);

  const retrySession = useCallback(async () => {
    const user = await loadSession();
    if (user) void sync(user.id);
  }, [loadSession, sync]);

  const syncCurrentPage = useCallback(() => {
    if (account) void sync(account.id, page);
  }, [account, page, sync]);

  return {
    account,
    online,
    sessionIssue,
    loadSession,
    clearSession,
    queue,
    sent,
    reports,
    page,
    more,
    message,
    listIssue,
    edit,
    syncing,
    discard,
    loadReports,
    sync,
    syncCurrentPage,
    clearMessage,
    editReport,
    discardReport,
    cancelDiscard,
    confirmDiscard,
    reportSaved,
    retrySession,
    clearEdit,
  };
}
