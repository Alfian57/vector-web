"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiData, errorMessage } from "@/lib/client";
import { districtPath, type District, type FollowUp, type Report } from "@/lib/domain";
import { districtCollectionSchema, followUpSchema, reportPageResponseSchema } from "@/lib/api-contracts";
import { officerPath, officerRequiredPath, signInFor } from "@/lib/routes";

const followUpsSchema = followUpSchema.array();

type UsePplDashboardOptions = {
  filter: string;
  finding: string;
  page: number;
  refreshRadar: () => Promise<void>;
};

export function usePplDashboard({ filter, finding, page, refreshRadar }: UsePplDashboardOptions) {
  const [reports, setReports] = useState<Report[]>();
  const [hasMore, setHasMore] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtError, setDistrictError] = useState(false);
  const [revision, setRevision] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({ scope: "ppl", status: filter, finding, page: String(page) });
      const [queue, follow] = await Promise.allSettled([
        apiData(`reports?${params}`, reportPageResponseSchema, { signal }),
        apiData("ppl/follow-ups", followUpsSchema, { signal }),
      ]);
      if (signal?.aborted) return;
      if (queue.status === "rejected" && queue.reason instanceof ApiError) {
        if (queue.reason.status === 401) {
          window.location.replace(signInFor(officerPath));
          return;
        }
        if (queue.reason.status === 403) {
          window.location.replace(officerRequiredPath);
          return;
        }
      }
      if (queue.status === "fulfilled") {
        setReports(queue.value.reports);
        setHasMore(queue.value.hasMore);
      }
      if (follow.status === "fulfilled") setFollowUps(follow.value);
      const failure = queue.status === "rejected" ? queue : follow.status === "rejected" ? follow : null;
      setError(failure ? errorMessage(failure.reason) : "");
    },
    [filter, finding, page],
  );

  useEffect(() => {
    const pending = new AbortController();
    const initial = setTimeout(() => void load(pending.signal), 0);
    const stream = new EventSource("/api/ppl/events");
    stream.addEventListener("refresh", (event: MessageEvent) => {
      setLive(true);
      setRevision(event.lastEventId);
      void load(pending.signal);
      void refreshRadar();
    });
    stream.onerror = () => setLive(false);
    return () => {
      clearTimeout(initial);
      pending.abort();
      stream.close();
    };
  }, [load, refreshRadar]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void fetch(districtPath, { signal })
      .then((response) => {
        if (!response.ok) throw new Error("Districts unavailable");
        return response.json().then((payload: unknown) => payload);
      })
      .then((payload) => {
        const result = districtCollectionSchema.safeParse(payload);
        if (!result.success) throw new Error("Districts unavailable");
        return result.data;
      })
      .then(({ features }) => {
        if (!signal.aborted)
          setDistricts(features.map(({ properties }) => properties).sort((a, b) => a.name.localeCompare(b.name, "id")));
      })
      .catch(() => {
        if (!signal.aborted) setDistrictError(true);
      });
    return () => controller.abort();
  }, []);

  const clearReports = useCallback(() => setReports(undefined), []);

  return { reports, hasMore, live, error, followUps, districts, districtError, revision, load, clearReports };
}
