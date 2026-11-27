"use client";

import { useEffect, useState } from "react";
import * as maplibre from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import type { OfflineMap } from "@/lib/pwa/storage";
import { districtsSource, loadMapTilerStyle, localSource, pinSource, type MapMode } from "./radar-style";
import type { PopupState } from "./radar-map-popup";

export type MapChoice = { mode: MapMode };
export type ProviderStatus = { choice: MapChoice; state: "loading" | "ready" | "failed" };

export function useRadarMapProvider({
  mapRef,
  localStyleRef,
  usingProviderRef,
  popupRef,
  choice,
  mapTilerKey,
  online,
  tileUrl,
  offlineMap,
}: {
  mapRef: { current: maplibre.Map | null };
  localStyleRef: { current: StyleSpecification | null };
  usingProviderRef: { current: boolean };
  popupRef: { current: PopupState | null };
  choice: MapChoice;
  mapTilerKey: string | undefined;
  online: boolean;
  tileUrl: string | undefined;
  offlineMap: OfflineMap | undefined;
}) {
  const [provider, setProvider] = useState<ProviderStatus>();
  const providerState = mapTilerKey && online && provider?.choice === choice ? provider.state : undefined;

  useEffect(() => {
    const instance = mapRef.current;
    const fallback = localStyleRef.current;
    if (!instance || !fallback) return;
    const mapInstance: maplibre.Map = instance;

    function restoreLocalStyle() {
      if (!usingProviderRef.current) return;
      usingProviderRef.current = false;
      popupRef.current?.popup.remove();
      mapInstance.setStyle(fallback, { diff: false });
    }

    if (!mapTilerKey || !online) {
      restoreLocalStyle();
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let newStyleApplied = false;
    const timeout = setTimeout(fail, 12_000);

    function fail() {
      if (signal.aborted) return;
      controller.abort();
      clearTimeout(timeout);
      restoreLocalStyle();
      setProvider({ choice, state: "failed" });
    }

    function markReady() {
      if (signal.aborted || !newStyleApplied) return;
      clearTimeout(timeout);
      mapInstance.off("idle", markReady);
      setProvider({ choice, state: "ready" });
    }

    function onError(event: maplibre.ErrorEvent) {
      const sourceId = "sourceId" in event ? event.sourceId : undefined;
      if (newStyleApplied && sourceId !== districtsSource && sourceId !== pinSource && sourceId !== localSource) {
        queueMicrotask(fail);
      }
    }

    mapInstance.on("idle", markReady);
    mapInstance.on("error", onError);
    queueMicrotask(() => {
      if (!signal.aborted) setProvider({ choice, state: "loading" });
    });
    void loadMapTilerStyle(mapTilerKey, choice.mode, signal)
      .then((style) => {
        if (signal.aborted) return;
        popupRef.current?.popup.remove();
        newStyleApplied = true;
        usingProviderRef.current = true;
        mapInstance.setStyle(style, { diff: false });
      })
      .catch(fail);

    return () => {
      controller.abort();
      clearTimeout(timeout);
      mapInstance.off("idle", markReady);
      mapInstance.off("error", onError);
    };
  }, [choice, mapTilerKey, mapRef, localStyleRef, usingProviderRef, popupRef, online, tileUrl, offlineMap]);

  return { providerState };
}
