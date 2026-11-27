"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as maplibre from "maplibre-gl";
import type { GeoJSONSource, StyleSpecification } from "maplibre-gl";
import { FileSource, PMTiles, Protocol } from "pmtiles";
import { mapBounds, type DistrictSummary, type Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import {
  districtFill, districtsSource, districtStates, loadMapTilerStyle, localRadarStyle, localSource, pinSource,
  type DistrictState, type MapMode,
} from "./radar-style";
import "maplibre-gl/dist/maplibre-gl.css";
import "./radar-map.css";

const protocol = new Protocol();
const formatCount = new Intl.NumberFormat("id-ID");
let registered = false;

function watchNetwork(update: () => void) {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
}

type PopupState = { popup: maplibre.Popup; id: string; name: string };

function updatePopup({ popup, id, name }: PopupState, districts: Map<string, DistrictState> | null) {
  const count = districts?.get(id)?.count ?? 0;
  const cluster = districts?.get(id)?.clustered ?? false;
  const content = document.createElement("div");
  content.className = "district-popup";
  const title = document.createElement("strong");
  title.textContent = name;
  content.append(title);
  if (districts) {
    const total = document.createElement("p");
    total.textContent = `${formatCount.format(count)} laporan terverifikasi`;
    const state = document.createElement("span");
    state.className = cluster ? "tag tag-alert" : count > 0 ? "tag tag-pending" : "tag";
    state.textContent = cluster ? "Klaster aktif" : count > 0 ? "Temuan sporadis" : "Tanpa temuan";
    content.append(total, state);
  } else {
    const note = document.createElement("p");
    note.textContent = "Ringkasan temuan belum tersedia.";
    content.append(note);
  }
  popup.setDOMContent(content);
}

function whenStyleReady(map: maplibre.Map, sourceId: string, apply: (source: GeoJSONSource) => void) {
  let appliedTo: GeoJSONSource | undefined;
  const update = () => {
    if (!map.isStyleLoaded()) return;
    const source = map.getSource<GeoJSONSource>(sourceId);
    if (!source || appliedTo === source) return;
    appliedTo = source;
    apply(source);
  };
  map.on("styledata", update);
  map.on("idle", update);
  update();
  return () => { map.off("styledata", update); map.off("idle", update); };
}

type MapChoice = { mode: MapMode };
type ProviderStatus = { choice: MapChoice; state: "loading" | "ready" | "failed" };

export function RadarMap({ summaries, tileUrl, offlineMap, mapTilerKey, selected, onPick, className }: {
  summaries?: readonly DistrictSummary[];
  tileUrl?: string;
  offlineMap?: OfflineMap;
  mapTilerKey?: string;
  selected?: Position;
  onPick?: (point: Position) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibre.Map | null>(null);
  const localStyle = useRef<StyleSpecification | null>(null);
  const usingProvider = useRef(false);
  const picker = useRef(onPick);
  const popup = useRef<PopupState | null>(null);
  const districts = useMemo(() => summaries ? districtStates(summaries) : null, [summaries]);
  const currentDistricts = useRef(districts);
  const [ready, setReady] = useState(false);
  const [tileIssue, setTileIssue] = useState(false);
  const [mapIssue, setMapIssue] = useState(false);
  const [choice, setChoice] = useState<MapChoice>({ mode: "map" });
  const [provider, setProvider] = useState<ProviderStatus>();
  const online = useSyncExternalStore(watchNetwork, () => navigator.onLine, () => true);
  const providerState = mapTilerKey && online && provider?.choice === choice ? provider.state : undefined;
  const showSatelliteChoice = online && providerState !== "failed" && choice.mode === "satellite";

  useEffect(() => { picker.current = onPick; }, [onPick]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (!registered) {
      maplibre.setWorkerUrl(`/maplibre-worker.mjs?v=${maplibre.getVersion()}`);
      maplibre.addProtocol("pmtiles", protocol.tile);
      registered = true;
    }
    let tileSource = tileUrl ? new URL(tileUrl, location.origin).href : undefined;
    if (offlineMap) {
      tileSource = `karawang-${offlineMap.version}.pmtiles`;
      protocol.add(new PMTiles(new FileSource(new File([offlineMap.file], tileSource))));
    }
    const style = localRadarStyle(tileSource);
    localStyle.current = style;
    usingProvider.current = false;

    let instance: maplibre.Map;
    try {
      instance = new maplibre.Map({
        container: element, style, bounds: mapBounds, fitBoundsOptions: { padding: 18 },
        locale: {
          "NavigationControl.ZoomIn": "Perbesar peta",
          "NavigationControl.ZoomOut": "Perkecil peta",
          "Popup.CloseButton": "Tutup ringkasan",
        },
        maxBounds: [[106.63, -6.93], [108.05, -5.55]], fadeDuration: 0,
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
      const overview = {
        popup: new maplibre.Popup({ className: "radar-popup", maxWidth: "240px", focusAfterOpen: false }),
        id: feature.id, name,
      };
      updatePopup(overview, currentDistricts.current);
      overview.popup.setLngLat(event.lngLat).addTo(instance);
      popup.current = overview;
    });
    instance.on("mouseenter", districtFill, () => {
      if (!picker.current) instance.getCanvas().style.cursor = "pointer";
    });
    instance.on("mouseleave", districtFill, () => { instance.getCanvas().style.cursor = ""; });
    return () => {
      popup.current?.popup.remove();
      popup.current = null;
      map.current = null;
      localStyle.current = null;
      instance.remove();
    };
  }, [tileUrl, offlineMap]);

  useEffect(() => {
    const instance = map.current;
    const fallback = localStyle.current;
    if (!instance || !fallback) return;
    function useLocal() {
      if (!instance || !fallback || !usingProvider.current) return;
      usingProvider.current = false;
      popup.current?.popup.remove();
      instance.setStyle(fallback, { diff: false });
    }
    if (!mapTilerKey || !online) {
      useLocal();
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
      useLocal();
      setProvider({ choice, state: "failed" });
    }
    function markReady() {
      if (signal.aborted || !newStyleApplied) return;
      clearTimeout(timeout);
      instance?.off("idle", markReady);
      setProvider({ choice, state: "ready" });
    }
    function onError(event: maplibre.ErrorEvent) {
      const sourceId = "sourceId" in event ? event.sourceId : undefined;
      if (newStyleApplied && sourceId !== districtsSource && sourceId !== pinSource && sourceId !== localSource) {
        queueMicrotask(fail);
      }
    }
    instance.on("idle", markReady);
    instance.on("error", onError);
    queueMicrotask(() => { if (!signal.aborted) setProvider({ choice, state: "loading" }); });
    void loadMapTilerStyle(mapTilerKey, choice.mode, signal).then((style) => {
      if (signal.aborted) return;
      popup.current?.popup.remove();
      newStyleApplied = true;
      usingProvider.current = true;
      instance.setStyle(style, { diff: false });
    }).catch(fail);
    return () => {
      controller.abort();
      clearTimeout(timeout);
      instance.off("idle", markReady);
      instance.off("error", onError);
    };
  }, [choice, mapTilerKey, offlineMap, online, tileUrl]);

  useEffect(() => {
    currentDistricts.current = districts;
    if (popup.current?.popup.isOpen()) updatePopup(popup.current, districts);
    const instance = map.current;
    if (!instance) return;
    return whenStyleReady(instance, districtsSource, () => {
      instance.removeFeatureState({ source: districtsSource });
      if (!districts) return;
      for (const [id, state] of districts) {
        instance.setFeatureState({ source: districtsSource, id }, state);
      }
    });
  }, [districts, tileUrl, offlineMap]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    return whenStyleReady(instance, pinSource, (source) => source.setData(selected
      ? { type: "Point", coordinates: [selected.longitude, selected.latitude] }
      : { type: "FeatureCollection", features: [] }));
  }, [selected, tileUrl, offlineMap]);

  return <div className={`map-frame ${className ?? ""}`}>
    <div ref={container} className={`map-canvas ${onPick ? "map-picker" : ""}`} aria-label="Peta kecamatan Karawang" />
    {mapTilerKey && !mapIssue && <div className="map-switch" role="group" aria-label="Jenis peta">
      <button type="button" aria-pressed={!showSatelliteChoice} onClick={() => setChoice({ mode: "map" })}>
        Peta
      </button>
      <button type="button" aria-pressed={showSatelliteChoice} disabled={!online}
        onClick={() => setChoice({ mode: "satellite" })}>
        Satelit
      </button>
    </div>}
    {providerState === "ready" && <a className="maptiler-logo" href="https://www.maptiler.com/"
      target="_blank" rel="noreferrer" aria-label="MapTiler" />}
    {mapIssue ? <p className="map-message" role="status">Peta memerlukan WebGL. Gunakan daftar temuan atau isi koordinat secara manual.</p>
      : providerState === "failed" ? <p className="map-message" role="status">
        {choice.mode === "satellite" ? "Citra satelit belum tersedia." : "Peta online belum tersedia."} Peta Karawang ditampilkan.
      </p> : providerState === "loading" && ready ? <p className="map-message" role="status">
        {choice.mode === "satellite" ? "Memuat citra satelit…" : "Memuat peta online…"}
      </p> : !ready ? <p className="map-message" role="status">Memuat peta Karawang…</p>
      : tileIssue && providerState !== "ready" && <p className="map-message" role="status">Peta dasar belum dapat dimuat.</p>}
  </div>;
}
