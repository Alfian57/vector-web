"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { districtPath, type MapPackage, type RadarSnapshot, type Weather } from "@/lib/domain";
import { prepareRadarShell } from "@/lib/pwa/radar-shell";
import { offlineDb, type OfflineMap } from "@/lib/pwa/storage";

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

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const [saved, map, snapshot, currentWeather, available] = await Promise.allSettled([
      offlineDb().snapshots.get("radar"),
      offlineDb().maps.get("karawang"),
      api<RadarSnapshot>("radar"),
      api<Weather | null>("weather"),
      api<MapPackage>("map-package"),
    ]);
    const cached = saved.status === "fulfilled" ? saved.value : undefined;
    const ready = map.status === "fulfilled" ? map.value : undefined;
    const fresh = snapshot.status === "fulfilled" ? snapshot.value : cached?.radar;
    const conditions = currentWeather.status === "fulfilled" ? currentWeather.value : cached?.weather ?? null;
    setRadar(fresh);
    setWeather(conditions);
    setRadarIssue(snapshot.status === "rejected");
    setWeatherIssue(currentWeather.status === "rejected");
    setTiles(available.status === "fulfilled" ? available.value : undefined);
    setOfflineMap((previous) => previous?.version === ready?.version ? previous : ready);
    setLoading(false);
    if (fresh) await offlineDb().snapshots.put({ key: "radar", radar: fresh, weather: conditions }).catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const initial = setTimeout(refresh, 0);
    window.addEventListener("online", refresh);
    return () => { clearTimeout(initial); window.removeEventListener("online", refresh); };
  }, [enabled, refresh]);

  async function saveMap() {
    if (!tiles || mapBusy) return;
    setMapBusy(true);
    setMapMessage("");
    try {
      if (!navigator.serviceWorker) throw new Error("Service worker unavailable");
      const [registration] = await Promise.all([
        Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker unavailable")), 10_000)),
        ]),
        fetch(districtPath).then((response) => { if (!response.ok) throw new Error("District boundaries unavailable"); }),
      ]);
      if (!registration.active) throw new Error("Service worker unavailable");
      const [response] = await Promise.all([fetch(tiles.url), prepareRadarShell(registration.active)]);
      if (!response.ok || response.status !== 200) throw new Error("Map unavailable");
      const file = await response.blob();
      if (file.size !== tiles.bytes || await file.slice(0, 7).text() !== "PMTiles") throw new Error("Incomplete map");
      const archive: OfflineMap = { key: "karawang", url: tiles.url, version: tiles.version, bytes: tiles.bytes, file };
      await offlineDb().maps.put(archive);
      setOfflineMap(archive);
      setMapMessage("Peta Karawang siap dibuka offline.");
    } catch {
      setMapMessage("Peta belum tersimpan. Periksa koneksi dan ruang penyimpanan.");
    } finally {
      setMapBusy(false);
    }
  }

  return { radar, weather, tiles, offlineMap, mapBusy, mapMessage, radarIssue, weatherIssue, loading, refresh, saveMap };
}
