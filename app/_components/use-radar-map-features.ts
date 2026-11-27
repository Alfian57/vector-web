"use client";

import { useEffect } from "react";
import type * as maplibre from "maplibre-gl";
import type { DistrictSummary, Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { districtsSource, districtStates, pinSource, type DistrictState } from "./radar-style";
import { updatePopup, type PopupState } from "./radar-map-popup";
import { whenStyleReady } from "./radar-map-style-sync";

export function useRadarMapFeatures({
  map,
  currentDistrictsRef,
  popupRef,
  summaries,
  selected,
  ready,
  tileUrl,
  offlineMap,
}: {
  map: { current: maplibre.Map | null };
  currentDistrictsRef: { current: Map<string, DistrictState> | null };
  popupRef: { current: PopupState | null };
  summaries: readonly DistrictSummary[] | undefined;
  selected: Position | undefined;
  ready: boolean;
  tileUrl: string | undefined;
  offlineMap: OfflineMap | undefined;
}) {
  useEffect(() => {
    const districts = summaries ? districtStates(summaries) : null;
    currentDistrictsRef.current = districts;
    if (popupRef.current?.popup.isOpen()) updatePopup(popupRef.current, districts);

    const instance = map.current;
    if (!instance) return;
    return whenStyleReady(instance, districtsSource, () => {
      instance.removeFeatureState({ source: districtsSource });
      if (!districts) return;
      for (const [id, state] of districts) {
        instance.setFeatureState({ source: districtsSource, id }, state);
      }
    });
  }, [map, currentDistrictsRef, popupRef, summaries, ready, tileUrl, offlineMap]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    return whenStyleReady(instance, pinSource, (source) =>
      source.setData(
        selected
          ? { type: "Point", coordinates: [selected.longitude, selected.latitude] }
          : { type: "FeatureCollection", features: [] },
      ),
    );
  }, [map, selected, ready, tileUrl, offlineMap]);
}
