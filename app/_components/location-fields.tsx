"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import type { MapPackage, Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { Map } from "./map";
import { FieldLabel } from "./field-label";

export type Coordinates = { longitude: string; latitude: string };

export function LocationFields({ value, onChange, tiles, offlineMap }: {
  value: Coordinates;
  onChange: (value: Coordinates) => void;
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
}) {
  const [message, setMessage] = useState("");
  const [showMap, setShowMap] = useState(false);
  const selected = value.longitude && value.latitude
    && Number.isFinite(Number(value.longitude)) && Number.isFinite(Number(value.latitude))
    ? { longitude: Number(value.longitude), latitude: Number(value.latitude) } : undefined;

  function update(point: Position) {
    onChange({ longitude: point.longitude.toFixed(6), latitude: point.latitude.toFixed(6) });
  }

  function locate() {
    if (!navigator.geolocation) { setMessage("GPS tidak tersedia. Pilih pin atau isi koordinat."); return; }
    setMessage("Mencari lokasi…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      update(coords);
      setMessage(`Lokasi ditemukan, ketelitian ±${Math.round(coords.accuracy)} m.`);
    }, () => setMessage("Lokasi belum ditemukan. Pilih pin atau isi koordinat."), { enableHighAccuracy: true, timeout: 10_000 });
  }

  return <fieldset className="location-fields">
    <legend>Lokasi di Karawang</legend>
    <div className="button-row">
      <button className="secondary" type="button" onClick={locate}><LocateFixed size={17} /> Gunakan GPS</button>
      <button className="secondary" type="button" aria-expanded={showMap} onClick={() => setShowMap(!showMap)}><MapPin size={17} /> {showMap ? "Tutup peta" : "Pilih pin di peta"}</button>
    </div>
    {showMap && <Map className="small-map" tileUrl={tiles?.url} mapTilerKey={tiles?.mapTilerKey}
      offlineMap={offlineMap} selected={selected} onPick={update} />}
    <div className="form-two">
      <label><FieldLabel required>Lintang</FieldLabel><input name="latitude" type="number" placeholder="Contoh: -6.33755" step="any" min={-90} max={90} required value={value.latitude} onChange={(event) => onChange({ ...value, latitude: event.target.value })} /></label>
      <label><FieldLabel required>Bujur</FieldLabel><input name="longitude" type="number" placeholder="Contoh: 107.29758" step="any" min={-180} max={180} required value={value.longitude} onChange={(event) => onChange({ ...value, longitude: event.target.value })} /></label>
    </div>
    {message && <p className="small muted" role="status">{message}</p>}
  </fieldset>;
}
