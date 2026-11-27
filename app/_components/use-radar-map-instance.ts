"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as maplibre from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { tw } from "@/lib/tw";
import { FileSource, PMTiles, Protocol } from "pmtiles";
import { mapBounds, type DistrictSummary, type Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { districtFill, districtStates, localRadarStyle, localSource, type DistrictState } from "./radar-style";
import { updatePopup, type PopupState } from "./radar-map-popup";

const protocol = new Protocol();
let registered = false;

export function useRadarMapInstance({
  container,
  summaries,
  tileUrl,
  offlineMap,
  onPick,
}: {
  container: RefObject<HTMLDivElement | null>;
  summaries: readonly DistrictSummary[] | undefined;
  tileUrl: string | undefined;
  offlineMap: OfflineMap | undefined;
  onPick: ((point: Position) => void) | undefined;
}) {
  const map = useRef<maplibre.Map | null>(null);
  const localStyle = useRef<StyleSpecification | null>(null);
  const usingProvider = useRef(false);
  const picker = useRef(onPick);
  const popup = useRef<PopupState | null>(null);
  const currentDistricts = useRef<Map<string, DistrictState> | null>(summaries ? districtStates(summaries) : null);
  const [ready, setReady] = useState(false);
  const [tileIssue, setTileIssue] = useState(false);
  const [mapIssue, setMapIssue] = useState(false);

  useEffect(() => {
    picker.current = onPick;
  }, [onPick]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (!registered) {
      maplibre.setWorkerUrl(`/maplibre-worker.mjs?v=${maplibre.getVersion()}`);
      maplibre.addProtocol("pmtiles", protocol.tile);
      registered = true;
    }
    let sourceUrl = tileUrl ? new URL(tileUrl, location.origin).href : undefined;
    if (offlineMap) {
      const fileName = `karawang-${offlineMap.version}.pmtiles`;
      sourceUrl = fileName;
      protocol.add(new PMTiles(new FileSource(new File([offlineMap.file], fileName))));
    }
    const fallbackStyle = localRadarStyle(sourceUrl);
    localStyle.current = fallbackStyle;
    usingProvider.current = false;

    let instance: maplibre.Map;
    try {
      instance = new maplibre.Map({
        container: element,
        style: fallbackStyle,
        bounds: mapBounds,
        fitBoundsOptions: { padding: 18 },
        locale: {
          "NavigationControl.ZoomIn": "Perbesar peta",
          "NavigationControl.ZoomOut": "Perkecil peta",
          "Popup.CloseButton": "Tutup ringkasan",
        },
        maxBounds: [
          [106.63, -6.93],
          [108.05, -5.55],
        ],
        fadeDuration: 0,
      });
    } catch {
      queueMicrotask(() => setMapIssue(true));
      return;
    }

    map.current = instance;
    instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
    instance.on("load", () => setReady(true));
    instance.on("error", (event) => {
      if ("sourceId" in event && event.sourceId === localSource) setTileIssue(true);
    });
    instance.on("click", (event) => {
      const { lng, lat } = event.lngLat;
      if (picker.current) {
        picker.current({ longitude: +lng.toFixed(6), latitude: +lat.toFixed(6) });
        return;
      }
      if (!instance.getLayer(districtFill)) return;
      const feature = instance.queryRenderedFeatures(event.point, { layers: [districtFill] })[0];
      const name: unknown = feature?.properties.name;
      if (typeof feature?.id !== "string" || typeof name !== "string") return;
      popup.current?.popup.remove();
      const nextPopup: PopupState = {
        popup: new maplibre.Popup({ className: tw("radar-popup"), maxWidth: "240px", focusAfterOpen: false }),
        id: feature.id,
        name,
      };
      updatePopup(nextPopup, currentDistricts.current);
      nextPopup.popup.setLngLat(event.lngLat).addTo(instance);
      popup.current = nextPopup;
    });
    instance.on("mouseenter", districtFill, () => {
      if (!picker.current) instance.getCanvas().style.cursor = "pointer";
    });
    instance.on("mouseleave", districtFill, () => {
      instance.getCanvas().style.cursor = "";
    });

    return () => {
      popup.current?.popup.remove();
      popup.current = null;
      map.current = null;
      localStyle.current = null;
      instance.remove();
    };
  }, [container, offlineMap, tileUrl]);

  return { map, localStyle, usingProvider, popup, currentDistricts, ready, tileIssue, mapIssue };
}
