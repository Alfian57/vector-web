"use client";

import { useEffect, useRef } from "react";
import { LngLatBounds, type Map as MapInstance } from "maplibre-gl";
import type { DistrictSummary, Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { districtFocus, districtsSource, districtStates, pinSource, type DistrictState } from "./radar-style";
import { updatePopup, type PopupState } from "./radar-map-popup";
import { whenStyleReady } from "./radar-map-style-sync";

export function useRadarMapFeatures({
  map,
  currentDistrictsRef,
  popupRef,
  summaries,
  selected,
  focusedDistrict,
  fitDistricts,
  ready,
  tileUrl,
  offlineMap,
}: {
  map: { current: MapInstance | null };
  currentDistrictsRef: { current: Map<string, DistrictState> | null };
  popupRef: { current: PopupState | null };
  summaries: readonly DistrictSummary[] | undefined;
  selected: Position | undefined;
  focusedDistrict: string | undefined;
  fitDistricts: boolean | undefined;
  ready: boolean;
  tileUrl: string | undefined;
  offlineMap: OfflineMap | undefined;
}) {
  const lastFrame = useRef<{ map: MapInstance; district?: string }>(undefined);

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

  useEffect(() => {
    const instance = map.current;
    if (!instance || (!focusedDistrict && !fitDistricts)) return;
    let current = true;
    const stop = whenStyleReady(instance, districtsSource, (source) => {
      instance.setFilter(districtFocus, ["==", ["get", "id"], focusedDistrict ?? ""]);
      const previous = lastFrame.current;
      if (previous?.map === instance && previous.district === focusedDistrict) return;
      if (!focusedDistrict) {
        void source
          .getBounds()
          .then((bounds) => {
            if (!current || bounds.isEmpty()) return;
            instance.fitBounds(bounds, { padding: 18, animate: false });
            lastFrame.current = { map: instance };
          })
          .catch(() => {
            // The initial viewport remains visible when district boundaries are unavailable.
          });
        return;
      }

      void source
        .getData()
        .then((data) => {
          if (!current || data.type !== "FeatureCollection") return;
          const shape = data.features.find(({ properties }) => properties?.id === focusedDistrict)?.geometry;
          if (shape?.type !== "Polygon" && shape?.type !== "MultiPolygon") return;
          const points = shape.type === "Polygon" ? shape.coordinates.flat() : shape.coordinates.flat(2);
          const bounds = new LngLatBounds();
          for (const [longitude, latitude] of points) bounds.extend([longitude, latitude]);
          if (bounds.isEmpty()) return;
          instance.fitBounds(bounds, { padding: 40, maxZoom: 12, animate: false });
          lastFrame.current = { map: instance, district: focusedDistrict };
        })
        .catch(() => {
          // The map already presents a notice if district features cannot be loaded.
        });
    });
    return () => {
      current = false;
      stop();
    };
  }, [map, focusedDistrict, fitDistricts, ready, tileUrl, offlineMap]);
}
