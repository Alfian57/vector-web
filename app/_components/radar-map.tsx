"use client";

import { Map as MapIcon, Satellite } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import type { DistrictSummary, Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { useRadarMapFeatures } from "./use-radar-map-features";
import { useRadarMapInstance } from "./use-radar-map-instance";
import { useRadarMapProvider, type MapChoice } from "./use-radar-map-provider";
import "maplibre-gl/dist/maplibre-gl.css";
import { DashboardSkeleton } from "./dashboard-state";

function watchNetwork(update: () => void) {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

export function RadarMap({
  summaries,
  tileUrl,
  offlineMap,
  mapTilerKey,
  selected,
  focusedDistrict,
  fitDistricts,
  onPick,
  className,
}: {
  summaries?: readonly DistrictSummary[];
  tileUrl?: string;
  offlineMap?: OfflineMap;
  mapTilerKey?: string;
  selected?: Position;
  focusedDistrict?: string;
  fitDistricts?: boolean;
  onPick?: (point: Position) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<MapChoice>({ mode: "map" });
  const online = useSyncExternalStore(
    watchNetwork,
    () => navigator.onLine,
    () => true,
  );
  const runtime = useRadarMapInstance({ container, summaries, tileUrl, offlineMap, onPick, fitDistricts });
  const { providerState } = useRadarMapProvider({
    mapRef: runtime.map,
    localStyleRef: runtime.localStyle,
    usingProviderRef: runtime.usingProvider,
    popupRef: runtime.popup,
    choice,
    mapTilerKey,
    online,
    tileUrl,
    offlineMap,
  });
  useRadarMapFeatures({
    map: runtime.map,
    currentDistrictsRef: runtime.currentDistricts,
    popupRef: runtime.popup,
    summaries,
    selected,
    focusedDistrict,
    fitDistricts,
    ready: runtime.ready,
    tileUrl,
    offlineMap,
  });

  const showSatelliteChoice = online && providerState !== "failed" && choice.mode === "satellite";
  return (
    <div className={`map-frame dashboard-map-frame${onPick ? "dashboard-map-frame--picker" : ""} ${className ?? ""}`}>
      <div
        ref={container}
        className={`map-canvas dashboard-map-canvas${onPick ? "map-picker" : ""}`}
        aria-label="Peta kecamatan Karawang"
      />
      {mapTilerKey && !runtime.mapIssue && (
        <div className="dashboard-map-modes" role="group" aria-label="Jenis peta">
          <button type="button" aria-pressed={!showSatelliteChoice} onClick={() => setChoice({ mode: "map" })}>
            <MapIcon size={15} aria-hidden="true" /> Peta
          </button>
          <button
            type="button"
            aria-pressed={showSatelliteChoice}
            disabled={!online}
            onClick={() => setChoice({ mode: "satellite" })}
          >
            <Satellite size={15} aria-hidden="true" /> Satelit
          </button>
        </div>
      )}
      {providerState === "ready" && (
        <a
          className="dashboard-map-provider"
          href="https://www.maptiler.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="MapTiler"
        />
      )}
      {runtime.mapIssue ? (
        <p className="dashboard-map-note" role="status">
          Peta memerlukan WebGL. Gunakan daftar temuan atau isi koordinat secara manual.
        </p>
      ) : providerState === "failed" ? (
        <p className="dashboard-map-note" role="status">
          {choice.mode === "satellite" ? "Citra satelit belum tersedia." : "Peta online belum tersedia."} Peta Karawang
          ditampilkan.
        </p>
      ) : providerState === "loading" && runtime.ready ? (
        <DashboardSkeleton
          kind="map"
          label={choice.mode === "satellite" ? "Memuat citra satelit…" : "Memuat peta online…"}
        />
      ) : !runtime.ready ? (
        <DashboardSkeleton kind="map" label="Memuat peta Karawang…" />
      ) : (
        runtime.tileIssue &&
        providerState !== "ready" && (
          <p className="dashboard-map-note" role="status">
            Peta dasar belum dapat dimuat.
          </p>
        )
      )}
    </div>
  );
}
