"use client";

import { Camera, Save } from "lucide-react";
import { useId, useRef } from "react";
import { findings, type MapPackage } from "@/lib/domain";
import type { OfflineMap, QueuedReport } from "@/lib/pwa/storage";
import { FieldLabel } from "./field-label";
import { ImageDropzone } from "./image-dropzone";
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
  variant = "page",
  onSaved,
}: {
  ownerId: string;
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
  edit?: QueuedReport;
  variant?: "page" | "dialog";
  onSaved: () => void;
}) {
  const photoHint = useId();
  const dateHint = useId();
  const issueId = useId();
  const photoTriggerButton = useRef<HTMLButtonElement>(null);
  const { photo, preview, coordinates, setCoordinates, issue, busy, processing, choosePhoto, submit } = useReportForm({
    ownerId,
    edit,
    onSaved,
    photoTriggerButton,
  });

  const photoIssue = issue?.field === "photo" ? issue : undefined;
  const dateIssue = issue?.field === "date" ? issue : undefined;

  return (
    <form className={tw(variant === "dialog" ? "field-form" : "panel field-form")} onSubmit={submit}>
      {variant === "page" && <h1>{edit ? "Perbaiki laporan" : "Catat temuan padi"}</h1>}
      <fieldset>
        <legend>
          <FieldLabel required>Foto daun</FieldLabel>
          <span className={tw("sr-only")}> (wajib)</span>
        </legend>
        <p className={tw("field-hint")} id={photoHint}>
          Seret foto daun ke area ini, pilih dari galeri, atau gunakan kamera.
        </p>
        <ImageDropzone
          inputId={`report-photo-${photoHint}`}
          inputLabel="Pilih foto daun"
          accept="image/jpeg,image/png,image/webp,image/heic"
          description="JPEG, PNG, WebP, atau HEIC · maksimal 20 MB"
          describedBy={photoIssue ? `${photoHint} ${issueId}` : photoHint}
          invalid={Boolean(photoIssue)}
          disabled={busy || processing}
          onFile={(file) => void choosePhoto(file)}
          triggerButtonRef={photoTriggerButton}
          className="dashboard-image-dropzone--report"
        >
          <label className={tw("secondary file-button dashboard-image-dropzone-camera")}>
            <Camera size={16} aria-hidden="true" /> Ambil foto
            <input
              type="file"
              aria-describedby={photoIssue ? `${photoHint} ${issueId}` : photoHint}
              aria-invalid={photoIssue ? true : undefined}
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              disabled={busy || processing}
              onChange={(event) => {
                void choosePhoto(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </ImageDropzone>
        {photoIssue && (
          <p id={issueId} className={tw("error-text")} role="alert">
            {photoIssue.message}
          </p>
        )}
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
              aria-describedby={dateIssue ? `${dateHint} ${issueId}` : dateHint}
              aria-invalid={dateIssue ? true : undefined}
              defaultValue={localDate(edit?.report.observedAt)}
            />
          </label>
          <p className={tw("field-hint")} id={dateHint}>
            Pilih tanggal dan jam saat temuan diamati.
          </p>
          {dateIssue && (
            <p id={issueId} className={tw("error-text")} role="alert">
              {dateIssue.message}
            </p>
          )}
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
      <LocationFields
        value={coordinates}
        onChange={setCoordinates}
        tiles={tiles}
        offlineMap={offlineMap}
        error={issue?.field === "location" ? issue.message : undefined}
      />
      {issue?.field === "form" && (
        <p className={tw("error-text")} role="alert">
          {issue.message}
        </p>
      )}
      <button className={tw("primary")} disabled={busy || processing}>
        <Save size={17} /> {busy ? "Menyimpan…" : "Simpan laporan"}
      </button>
    </form>
  );
}
