"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiData, errorMessage, jsonRequest } from "@/lib/client";
import { plotSchema } from "@/lib/api-contracts";
import type { Plot } from "@/lib/domain";

const plotsSchema = plotSchema.array();

type PlotInput = {
  name: string;
  longitude: number;
  latitude: number;
};

export function usePlots(list = true) {
  const [plots, setPlots] = useState<Plot[]>();
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");

  const loadPlots = useCallback(async (signal?: AbortSignal) => {
    try {
      const items = await apiData("plots", plotsSchema, { signal });
      if (!signal?.aborted) {
        setPlots(items);
        setIssue("");
      }
    } catch (error) {
      if (!signal?.aborted) setIssue(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (!list) return;
    const controller = new AbortController();
    void loadPlots(controller.signal);
    return () => controller.abort();
  }, [list, loadPlots]);

  function retryPlots() {
    setIssue("");
    void loadPlots();
  }

  async function addPlot(input: PlotInput) {
    if (busy) return false;
    setBusy(true);
    setIssue("");
    try {
      await api("plots", jsonRequest("POST", input));
      return true;
    } catch (error) {
      setIssue(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function removePlot(id: string, onRemoved: () => void) {
    if (busy) return false;
    setBusy(true);
    setIssue("");
    try {
      await api(`plots/${id}`, { method: "DELETE" });
      onRemoved();
      await loadPlots();
      return true;
    } catch (error) {
      setIssue(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { plots, busy, issue, addPlot, removePlot, retryPlots, clearIssue: () => setIssue("") };
}
