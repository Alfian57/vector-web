"use client";

import { Camera, ImagePlus, Save } from "lucide-react";
import { useId } from "react";
import { findings, type MapPackage } from "@/lib/domain";
import type { OfflineMap, QueuedReport } from "@/lib/pwa/storage";
import { FieldLabel } from "./field-label";
import { LocationFields } from "./location-fields";
import { useReportForm } from "./use-report-form";
import { tw } from "@/lib/tw";

function localDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ReportForm({
  ownerId,
  tiles,
  offlineMap,
  edit,
  onSaved,
}: {
  ownerId: string;
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
  edit?: QueuedReport;
  onSaved: () => void;
}) {
  const photoHint = useId();
  const dateHint = useId();
  const { photo, preview, coordinates, setCoordinates, error, busy, processing, choosePhoto, submit } = useReportForm({
    ownerId,
    edit,
    onSaved,
  });

  return (
    <form className={tw("panel field-form")} onSubmit={submit}>
      <h2>{edit ? "Perbaiki laporan" : "Catat temuan padi"}</h2>
      <fieldset>
        <legend>
          <FieldLabel required>Foto daun</FieldLabel>
          <span className={tw("sr-only")}> (wajib)</span>
        </legend>
        <p className={tw("field-hint")} id={photoHint}>
          Ambil satu foto daun atau pilih foto dari galeri.
        </p>
        <div className={tw("button-row")}>
          <label className={tw("secondary file-button")}>
            <Camera size={17} /> Ambil foto
            <input
              type="file"
              aria-describedby={photoHint}
              accept="image/*"
              capture="environment"
              disabled={processing}
              onChange={(event) => void choosePhoto(event.target.files?.[0])}
            />
          </label>
          <label className={tw("secondary file-button")}>
            <ImagePlus size={17} /> Pilih dari galeri
            <input
              type="file"
              aria-describedby={photoHint}
              accept="image/jpeg,image/png,image/webp,image/heic"
              disabled={processing}
              onChange={(event) => void choosePhoto(event.target.files?.[0])}
            />
          </label>
        </div>
        {processing && <p role="status">Memproses foto…</p>}
        {photo && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- This preview comes from a local object URL. */}
            <img className={tw("photo-preview")} ref={preview} alt="Pratinjau foto daun" />
            <p className={tw("inline-note")} role="status">
              Analisis foto belum tersedia. Isi gejala yang terlihat.
            </p>
          </>
        )}
      </fieldset>
      <div className={tw("form-two")}>
        <div>
          <label>
            <FieldLabel required>Waktu pengamatan</FieldLabel>
            <input
              type="datetime-local"
              name="observedAt"
              required
              aria-describedby={dateHint}
              defaultValue={localDate(edit?.report.observedAt)}
            />
          </label>
          <p className={tw("field-hint")} id={dateHint}>
            Pilih tanggal dan jam saat temuan diamati.
          </p>
        </div>
        <label>
          <FieldLabel>Dugaan temuan</FieldLabel>
          <select name="finding" defaultValue={edit?.report.finding ?? "unknown"}>
            <option value="unknown">Pilih dugaan temuan bila diketahui</option>
            {Object.entries(findings)
              .filter(([value]) => value !== "unknown")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label>
        <FieldLabel>Catatan gejala</FieldLabel>
        <textarea
          name="notes"
          rows={3}
          maxLength={600}
          defaultValue={edit?.report.notes}
          placeholder="Contoh: bercak terlihat di tiga rumpun."
        />
      </label>
      <LocationFields value={coordinates} onChange={setCoordinates} tiles={tiles} offlineMap={offlineMap} />
      {error && (
        <p className={tw("error-text")} role="alert">
          {error}
        </p>
      )}
      <button className={tw("primary")} disabled={busy || processing}>
        <Save size={17} /> {busy ? "Menyimpan…" : "Simpan laporan"}
      </button>
    </form>
  );
}
