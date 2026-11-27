"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Account } from "@/lib/domain";
import { offlineDb } from "@/lib/pwa/storage";

export function useRadarSession(onOwnerChange: () => void) {
  const [account, setAccount] = useState<Account | null>();
  const [sessionIssue, setSessionIssue] = useState(false);
  const accountId = useRef<string | undefined>(undefined);
  const pending = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => pending.current?.abort(), []);

  const showAccount = useCallback((user: Account | null) => {
    if (accountId.current !== user?.id) {
      accountId.current = user?.id;
      onOwnerChange();
    }
    setAccount(user);
  }, [onOwnerChange]);

  const loadSession = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const database = offlineDb();
    const { signal } = controller;
    try {
      const user = await api<Account | null>("session", { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
      if (signal.aborted) return undefined;
      if (user) await database.accounts.put({ key: "account", account: user }).catch(() => {});
      else await database.accounts.delete("account").catch(() => {});
      if (signal.aborted) return undefined;
      setSessionIssue(false);
      showAccount(user);
      return user;
    } catch {
      if (signal.aborted) return undefined;
      if (navigator.onLine) {
        setSessionIssue(true);
        return undefined;
      }
      const saved = await database.accounts.get("account").catch(() => undefined);
      if (signal.aborted) return undefined;
      setSessionIssue(false);
      showAccount(saved?.account ?? null);
      return null;
    }
  }, [showAccount]);

  async function clearSession() {
    pending.current?.abort();
    await offlineDb().accounts.delete("account").catch(() => {});
    setSessionIssue(false);
    showAccount(null);
  }

  return { account, accountId, sessionIssue, loadSession, clearSession };
}
