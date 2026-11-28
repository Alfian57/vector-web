"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiData } from "@/lib/client";
import { mapPackageSchema, radarSnapshotSchema, weatherSchema } from "@/lib/api-contracts";
import { districtPath, type MapPackage, type RadarSnapshot, type Weather } from "@/lib/domain";
import { prepareRadarShell } from "@/lib/pwa/radar-shell";
import { offlineDb, type OfflineMap } from "@/lib/pwa/storage";
import { showToast } from "./toast";

export function useRadar(enabled = true) {
  const [radar, setRadar] = useState<RadarSnapshot>();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [tiles, setTiles] = useState<MapPackage>();
  const [offlineMap, setOfflineMap] = useState<OfflineMap>();
  const [mapBusy, setMapBusy] = useState(false);
  const [mapMessage, setMapMessage] = useState("");
  const [radarIssue, setRadarIssue] = useState(false);
  const [weatherIssue, setWeatherIssue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [packageLoading, setPackageLoading] = useState(true);
  const [mapResult, setMapResult] = useState<"error">();
  const pending = useRef<AbortController>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const { signal } = controller;
    const request = { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) };
    const storage = offlineDb();
    const cached = storage.snapshots.get("radar").catch(() => undefined);
    setLoading(true);
    setWeatherLoading(true);
    setPackageLoading(true);

    const radarRequest = apiData("radar", radarSnapshotSchema, request)
      .then((snapshot) => {
        if (!signal.aborted) {
          setRadar(snapshot);
          setRadarIssue(false);
          setLoading(false);
        }
        return snapshot;
      })
      .catch(async () => {
        const snapshot = (await cached)?.radar;
        if (!signal.aborted) {
          setRadar((current) => current ?? snapshot);
          setRadarIssue(true);
          setLoading(false);
        }
        return snapshot;
      });

    const weatherRequest = apiData("weather", weatherSchema.nullable(), request)
      .then((conditions) => {
        if (!signal.aborted) {
          setWeather(conditions);
          setWeatherIssue(false);
          setWeatherLoading(false);
        }
        return conditions;
      })
      .catch(async () => {
        const conditions = (await cached)?.weather ?? null;
        if (!signal.aborted) {
          setWeather((current) => current ?? conditions);
          setWeatherIssue(true);
          setWeatherLoading(false);
        }
        return conditions;
      });

    const mapRequest = Promise.allSettled([
      storage.maps.get("karawang"),
      apiData("map-package", mapPackageSchema, request),
    ]).then(([saved, available]) => {
      if (signal.aborted) return;
      if (saved.status === "fulfilled") {
        setOfflineMap((previous) => (previous?.version === saved.value?.version ? previous : saved.value));
      }
      if (available.status === "fulfilled") setTiles(available.value);
      setPackageLoading(false);
    });

    const [snapshot, conditions] = await Promise.all([radarRequest, weatherRequest, mapRequest]);
    if (!signal.aborted && snapshot) {
      await storage.snapshots.put({ key: "radar", radar: snapshot, weather: conditions }).catch(() => {});
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const initial = setTimeout(refresh, 0);
    window.addEventListener("online", refresh);
    return () => {
      pending.current?.abort();
      clearTimeout(initial);
      window.removeEventListener("online", refresh);
    };
  }, [enabled, refresh]);

  async function saveMap() {
    if (!tiles || mapBusy) return;
    setMapBusy(true);
    setMapResult(undefined);
    setMapMessage("");
    try {
      if (!navigator.serviceWorker) throw new Error("Service worker unavailable");
      const [registration] = await Promise.all([
        Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker unavailable")), 10_000)),
        ]),
        fetch(districtPath).then((response) => {
          if (!response.ok) throw new Error("District boundaries unavailable");
        }),
      ]);
      if (!registration.active) throw new Error("Service worker unavailable");
      const [response] = await Promise.all([fetch(tiles.url), prepareRadarShell(registration.active, true)]);
      if (!response.ok || response.status !== 200) throw new Error("Map unavailable");
      const file = await response.blob();
      if (file.size !== tiles.bytes || (await file.slice(0, 7).text()) !== "PMTiles") throw new Error("Incomplete map");
      const archive: OfflineMap = { key: "karawang", url: tiles.url, version: tiles.version, bytes: tiles.bytes, file };
      await offlineDb().maps.put(archive);
      setOfflineMap(archive);
      showToast("Peta Karawang siap dibuka offline.");
    } catch {
      setMapResult("error");
      setMapMessage("Peta belum tersimpan. Periksa koneksi dan ruang penyimpanan.");
    } finally {
      setMapBusy(false);
    }
  }

  return {
    radar,
    weather,
    tiles,
    offlineMap,
    mapBusy,
    mapMessage,
    radarIssue,
    weatherIssue,
    loading,
    weatherLoading,
    packageLoading,
    mapResult,
    refresh,
    saveMap,
  };
}
