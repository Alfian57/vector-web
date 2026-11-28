"use client";

import { LocateFixed } from "lucide-react";
import { useId, useState } from "react";
import type { MapPackage, Position } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { Map } from "./map";
import { FieldLabel } from "./field-label";
import { tw } from "@/lib/tw";

export type Coordinates = { longitude: string; latitude: string };

export function LocationFields({
  value,
  onChange,
  tiles,
  offlineMap,
  error,
}: {
  value: Coordinates;
  onChange: (value: Coordinates) => void;
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
  error?: string;
}) {
  const [message, setMessage] = useState("");
  const errorId = useId();
  const [locating, setLocating] = useState(false);
  const selected =
    value.longitude &&
    value.latitude &&
    Number.isFinite(Number(value.longitude)) &&
    Number.isFinite(Number(value.latitude))
      ? { longitude: Number(value.longitude), latitude: Number(value.latitude) }
      : undefined;

  function update(point: Position) {
    onChange({ longitude: point.longitude.toFixed(6), latitude: point.latitude.toFixed(6) });
  }

  function locate() {
    if (locating) return;
    if (!navigator.geolocation) {
      setMessage("GPS tidak tersedia. Pilih titik di peta atau isi koordinat.");
      return;
    }
    setMessage("Mencari lokasi…");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update(coords);
        setLocating(false);
        setMessage(`Lokasi ditemukan, ketelitian ±${Math.round(coords.accuracy)} m.`);
      },
      () => {
        setLocating(false);
        setMessage("Lokasi belum ditemukan. Pilih titik di peta atau isi koordinat.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <fieldset className={tw("location-fields")}>
      <legend>Lokasi di Karawang</legend>
      <div className={tw("button-row")}>
        <button className={tw("secondary")} type="button" onClick={locate} disabled={locating}>
          <LocateFixed size={17} aria-hidden="true" /> {locating ? "Mencari lokasi…" : "Gunakan GPS"}
        </button>
      </div>
      <p className={tw("field-hint")}>
        Pilih titik langsung di peta. Gunakan GPS untuk memindahkan pin ke lokasi Anda.
      </p>
      <Map
        className={tw("small-map")}
        tileUrl={tiles?.url}
        mapTilerKey={tiles?.mapTilerKey}
        offlineMap={offlineMap}
        selected={selected}
        onPick={update}
      />
      <div className={tw("form-two")}>
        <label>
          <FieldLabel required>Lintang</FieldLabel>
          <input
            name="latitude"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            type="number"
            placeholder="Contoh: -6.33755"
            step="any"
            min={-90}
            max={90}
            required
            value={value.latitude}
            onChange={(event) => onChange({ ...value, latitude: event.target.value })}
          />
        </label>
        <label>
          <FieldLabel required>Bujur</FieldLabel>
          <input
            name="longitude"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            type="number"
            placeholder="Contoh: 107.29758"
            step="any"
            min={-180}
            max={180}
            required
            value={value.longitude}
            onChange={(event) => onChange({ ...value, longitude: event.target.value })}
          />
        </label>
      </div>
      {error && (
        <p id={errorId} className={tw("error-text")} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={tw("small muted")} role="status">
          {message}
        </p>
      )}
    </fieldset>
  );
}
