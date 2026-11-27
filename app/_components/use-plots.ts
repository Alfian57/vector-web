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

export function usePlots() {
  const [plots, setPlots] = useState<Plot[]>();
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");

  const loadPlots = useCallback(async () => {
    try {
      setPlots(await apiData("plots", plotsSchema));
    } catch (error) {
      setIssue(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void apiData("plots", plotsSchema, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setPlots(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setIssue(errorMessage(error));
      });
    return () => controller.abort();
  }, []);

  async function addPlot(input: PlotInput) {
    setBusy(true);
    setIssue("");
    try {
      await api("plots", jsonRequest("POST", input));
      await loadPlots();
      return true;
    } catch (error) {
      setIssue(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function removePlot(id: string, onRemoved: () => void) {
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

  return { plots, busy, issue, addPlot, removePlot };
}
