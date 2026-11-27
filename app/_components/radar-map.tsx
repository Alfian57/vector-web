"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { DistrictSummary, Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { useRadarMapFeatures } from "./use-radar-map-features";
import { useRadarMapInstance } from "./use-radar-map-instance";
import { useRadarMapProvider, type MapChoice } from "./use-radar-map-provider";
import "maplibre-gl/dist/maplibre-gl.css";
import { tw } from "@/lib/tw";

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
  onPick,
  className,
}: {
  summaries?: readonly DistrictSummary[];
  tileUrl?: string;
  offlineMap?: OfflineMap;
  mapTilerKey?: string;
  selected?: Position;
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
  const runtime = useRadarMapInstance({ container, summaries, tileUrl, offlineMap, onPick });
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
    ready: runtime.ready,
    tileUrl,
    offlineMap,
  });

  const showSatelliteChoice = online && providerState !== "failed" && choice.mode === "satellite";
  return (
    <div className={tw(`map-frame ${className ?? ""}`)}>
      <div
        ref={container}
        className={tw(`map-canvas ${onPick ? "map-picker" : ""}`)}
        aria-label="Peta kecamatan Karawang"
      />
      {mapTilerKey && !runtime.mapIssue && (
        <div
          className={tw(
            "absolute top-2.5 left-2.5 z-[1] flex gap-0.5 rounded-lg border border-[#bbc7b6] bg-[#fffdf5] p-[3px] shadow-[0_2px_8px_#15271d24]",
          )}
          role="group"
          aria-label="Jenis peta"
        >
          <button
            className={tw(
              "min-h-[37px] rounded-[5px] bg-transparent px-[11px] py-[5px] text-[.78rem] font-[650] text-[#203d37] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#487139] disabled:text-[#5e6b61] disabled:opacity-70 aria-pressed:bg-[#203d37] aria-pressed:text-[#fffdf5]",
            )}
            type="button"
            aria-pressed={!showSatelliteChoice}
            onClick={() => setChoice({ mode: "map" })}
          >
            Peta
          </button>
          <button
            className={tw(
              "min-h-[37px] rounded-[5px] bg-transparent px-[11px] py-[5px] text-[.78rem] font-[650] text-[#203d37] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#487139] disabled:text-[#5e6b61] disabled:opacity-70 aria-pressed:bg-[#203d37] aria-pressed:text-[#fffdf5]",
            )}
            type="button"
            aria-pressed={showSatelliteChoice}
            disabled={!online}
            onClick={() => setChoice({ mode: "satellite" })}
          >
            Satelit
          </button>
        </div>
      )}
      {providerState === "ready" && (
        <a
          className={tw(
            "absolute bottom-[9px] left-[9px] z-[1] h-[26px] w-[82px] rounded-[4px] bg-[#fffdf5] bg-[url(https://api.maptiler.com/resources/logo.svg)] [background-size:68px_auto] bg-center bg-no-repeat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#487139]",
          )}
          href="https://www.maptiler.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="MapTiler"
        />
      )}
      {runtime.mapIssue ? (
        <p className={tw("map-message")} role="status">
          Peta memerlukan WebGL. Gunakan daftar temuan atau isi koordinat secara manual.
        </p>
      ) : providerState === "failed" ? (
        <p className={tw("map-message")} role="status">
          {choice.mode === "satellite" ? "Citra satelit belum tersedia." : "Peta online belum tersedia."} Peta Karawang
          ditampilkan.
        </p>
      ) : providerState === "loading" && runtime.ready ? (
        <p className={tw("map-message")} role="status">
          {choice.mode === "satellite" ? "Memuat citra satelit…" : "Memuat peta online…"}
        </p>
      ) : !runtime.ready ? (
        <p className={tw("map-message")} role="status">
          Memuat peta Karawang…
        </p>
      ) : (
        runtime.tileIssue &&
        providerState !== "ready" && (
          <p className={tw("map-message")} role="status">
            Peta dasar belum dapat dimuat.
          </p>
        )
      )}
    </div>
  );
}
