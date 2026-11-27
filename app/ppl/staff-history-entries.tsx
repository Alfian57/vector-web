"use client";

import { useEffect, useState, type Key, type ReactNode } from "react";
import type { z } from "zod";
import { apiData, errorMessage } from "@/lib/client";
import type { Page } from "@/lib/domain";
import { pageSchema } from "@/lib/api-contracts";
import { HistoryPages } from "./history-pages";
import { tw } from "@/lib/tw";

export type HistoryEntriesProps<T> = {
  path: string;
  revision: string | number;
  schema: z.ZodType<T>;
  entryKey: (entry: T) => Key;
  renderEntry: (entry: T) => ReactNode;
};

export function StaffHistoryEntries<T>({ path, revision, schema, entryKey, renderEntry }: HistoryEntriesProps<T>) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<T>>();
  const [issue, setIssue] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const pending = new AbortController();
    const { signal } = pending;
    const separator = path.includes("?") ? "&" : "?";
    void apiData(`${path}${separator}page=${page}`, pageSchema(schema), { signal })
      .then((result) => {
        if (!signal.aborted) {
          setData(result);
          setIssue("");
        }
      })
      .catch((error) => {
        if (!signal.aborted) setIssue(errorMessage(error));
      });
    return () => pending.abort();
  }, [path, page, revision, reload, schema]);

  return (
    <>
      {issue && (
        <p className={tw("panel-note error-text")} role="alert">
          {issue}{" "}
          <button className={tw("text-link")} onClick={() => setReload((value) => value + 1)}>
            Coba lagi
          </button>
        </p>
      )}
      {data ? (
        data.entries.length ? (
          <ul className={tw("list")}>
            {data.entries.map((entry) => (
              <li key={entryKey(entry)}>{renderEntry(entry)}</li>
            ))}
          </ul>
        ) : (
          <p className={tw("panel-note muted")}>Riwayat masih kosong.</p>
        )
      ) : (
        !issue && (
          <p className={tw("panel-note")} role="status">
            Memuat riwayat…
          </p>
        )
      )}
      <HistoryPages
        page={page}
        hasMore={data?.hasMore}
        onPage={(next) => {
          setPage(next);
          setData(undefined);
        }}
      />
    </>
  );
}
