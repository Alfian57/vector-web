"use client";

import { useEffect, useState, type Key, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/client";
import type { Page } from "@/lib/domain";

export function HistoryPages({ page, hasMore, onPage }: { page: number; hasMore?: boolean; onPage: (page: number) => void }) {
  if (!page && !hasMore) return null;
  return <div className="panel-note button-row">
    <button type="button" className="secondary" disabled={!page} onClick={() => onPage(page - 1)}>Sebelumnya</button>
    <button type="button" className="secondary" disabled={!hasMore} onClick={() => onPage(page + 1)}>Berikutnya</button>
  </div>;
}

type HistoryProps<T> = {
  path: string;
  revision: string | number;
  entryKey: (entry: T) => Key;
  renderEntry: (entry: T) => ReactNode;
};

function HistoryEntries<T>({ path, revision, entryKey, renderEntry }: HistoryProps<T>) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<T>>();
  const [issue, setIssue] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const pending = new AbortController();
    const { signal } = pending;
    const separator = path.includes("?") ? "&" : "?";
    void api<Page<T>>(`${path}${separator}page=${page}`, { signal }).then((result) => {
      if (!signal.aborted) { setData(result); setIssue(""); }
    }).catch((error) => { if (!signal.aborted) setIssue(errorMessage(error)); });
    return () => pending.abort();
  }, [path, page, revision, reload]);

  return <>
    {issue && <p className="panel-note error-text" role="alert">{issue} <button className="text-link" onClick={() => setReload((value) => value + 1)}>Coba lagi</button></p>}
    {data ? (data.entries.length ? <ul className="list">{data.entries.map((entry) => <li key={entryKey(entry)}>{renderEntry(entry)}</li>)}</ul>
      : <p className="panel-note muted">Riwayat masih kosong.</p>) : !issue && <p className="panel-note" role="status">Memuat riwayat…</p>}
    <HistoryPages page={page} hasMore={data?.hasMore} onPage={(next) => { setPage(next); setData(undefined); }} />
  </>;
}

export function StaffHistory<T>({ title, ...props }: HistoryProps<T> & { title: string }) {
  const [open, setOpen] = useState(false);
  return <details className="staff-history" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>{title}</summary>
    {open && <HistoryEntries {...props} />}
  </details>;
}
