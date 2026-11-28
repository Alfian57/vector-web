"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodType } from "zod";
import { ApiError, apiData, errorMessage } from "@/lib/client";
import { districtPath, type District } from "@/lib/domain";
import { districtCollectionSchema } from "@/lib/api-contracts";
import { officerRequiredPath, signInFor } from "@/lib/routes";
import { useOfficerRevision } from "./officer-shell";

export function useOfficerData<T>(path: string, schema: ZodType<T>, resourceRevision?: number) {
  const revision = useOfficerRevision();
  const [reload, setReload] = useState(0);
  const requestKey = `${revision}/${resourceRevision ?? ""}/${reload}`;
  const [result, setResult] = useState<{ path: string; requestKey: string; data?: T; issue?: string }>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void apiData(path, schema, { signal })
      .then((data) => {
        if (!signal.aborted) setResult({ path, requestKey, data });
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          const destination = window.location.pathname + window.location.search;
          window.location.replace(error.status === 401 ? signInFor(destination) : officerRequiredPath);
          return;
        }
        setResult((previous) => ({
          path,
          requestKey,
          data: previous?.path === path ? previous.data : undefined,
          issue: errorMessage(error),
        }));
      });
    return () => controller.abort();
  }, [path, schema, requestKey]);

  const current = result?.path === path ? result : undefined;
  const loading = current?.requestKey !== requestKey;
  return {
    data: current?.data,
    issue: loading ? undefined : current?.issue,
    loading,
    retry: () => setReload((value) => value + 1),
  };
}

export function useRefreshOfficerPage(enabled = true) {
  const router = useRouter();
  const revision = useOfficerRevision();
  const lastRevision = useRef(revision);

  useEffect(() => {
    if (enabled && revision && revision !== lastRevision.current) router.refresh();
    lastRevision.current = revision;
  }, [enabled, revision, router]);
}

export function usePplDistricts(enabled = true) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [issue, setIssue] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const { signal } = controller;
    void fetch(districtPath, { signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Districts unavailable");
        const payload: unknown = await response.json();
        const { features } = districtCollectionSchema.parse(payload);
        if (!signal.aborted) {
          setDistricts(features.map(({ properties }) => properties).sort((a, b) => a.name.localeCompare(b.name, "id")));
          setIssue("");
        }
      })
      .catch(() => {
        if (!signal.aborted) setIssue("Daftar kecamatan belum tersedia.");
      });
    return () => controller.abort();
  }, [enabled, reload]);

  return { districts, issue, retry: () => setReload((value) => value + 1) };
}
