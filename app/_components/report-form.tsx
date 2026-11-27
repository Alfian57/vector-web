"use client";

import { Camera, ImagePlus, Save } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { findings, maxPhotoBytes, reportInput, type MapPackage } from "@/lib/domain";
import { offlineDb, type OfflineMap, type QueuedReport } from "@/lib/pwa/storage";
import { FieldLabel } from "./field-label";
import { LocationFields, type Coordinates } from "./location-fields";

function localDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

async function compress(file: File) {
  if (file.size > 20_000_000) throw new Error("Pilih foto dengan ukuran maksimal 20 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Foto tidak terbaca. Gunakan foto JPEG, PNG, atau WebP.");
  }
  try {
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Perangkat tidak dapat memproses foto ini.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
    if (!blob || blob.size > maxPhotoBytes) throw new Error("Foto terlalu besar setelah dikompresi.");
    return blob;
  } finally {
    bitmap.close();
  }
}

export function ReportForm({ ownerId, tiles, offlineMap, edit, onSaved }: {
  ownerId: string;
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
  edit?: QueuedReport;
  onSaved: () => void;
}) {
  const [photo, setPhoto] = useState<Blob | undefined>(edit?.photo);
  const preview = useRef<HTMLImageElement>(null);
  const photoHint = useId();
  const dateHint = useId();
  const [coordinates, setCoordinates] = useState<Coordinates>(edit
    ? { longitude: String(edit.report.longitude), latitude: String(edit.report.latitude) }
    : { longitude: "", latitude: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!photo || !preview.current) return;
    const url = URL.createObjectURL(photo);
    preview.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function choosePhoto(file?: File) {
    if (!file) return;
    setError("");
    setProcessing(true);
    try { setPhoto(await compress(file)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Foto tidak dapat diproses."); }
    finally { setProcessing(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || processing) return;
    setError("");
    if (!photo) { setError("Pilih foto daun sebelum menyimpan."); return; }
    const fields = new FormData(event.currentTarget);
    const observedAt = new Date(String(fields.get("observedAt")));
    if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > Date.now()) {
      setError("Periksa waktu pengamatan.");
      return;
    }
    const result = reportInput.safeParse({
      id: edit?.id ?? crypto.randomUUID(), observedAt: observedAt.toISOString(),
      longitude: Number(coordinates.longitude), latitude: Number(coordinates.latitude),
      finding: fields.get("finding"), notes: fields.get("notes"),
    });
    if (!result.success) { setError("Periksa kembali lokasi dan catatan gejala."); return; }
    setBusy(true);
    try {
      await offlineDb().queue.put({ id: result.data.id, ownerId, report: result.data, photo });
      onSaved();
    } catch {
      setError("Laporan belum tersimpan. Periksa ruang penyimpanan perangkat.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="panel field-form" onSubmit={submit}>
    <h2>{edit ? "Perbaiki laporan" : "Catat temuan padi"}</h2>
    <fieldset>
      <legend><FieldLabel required>Foto daun</FieldLabel><span className="sr-only"> (wajib)</span></legend>
      <p className="field-hint" id={photoHint}>Ambil satu foto daun atau pilih foto dari galeri.</p>
      <div className="button-row">
        <label className="secondary file-button"><Camera size={17} /> Ambil foto
          <input type="file" aria-describedby={photoHint} accept="image/*" capture="environment" disabled={processing} onChange={(event) => void choosePhoto(event.target.files?.[0])} />
        </label>
        <label className="secondary file-button"><ImagePlus size={17} /> Pilih dari galeri
          <input type="file" aria-describedby={photoHint} accept="image/jpeg,image/png,image/webp,image/heic" disabled={processing} onChange={(event) => void choosePhoto(event.target.files?.[0])} />
        </label>
      </div>
      {processing && <p role="status">Memproses foto…</p>}
      {photo && <>
        {/* eslint-disable-next-line @next/next/no-img-element -- This preview comes from a local object URL. */}
        <img className="photo-preview" ref={preview} alt="Pratinjau foto daun" />
        <p className="inline-note" role="status">Analisis foto belum tersedia. Isi gejala yang terlihat.</p>
      </>}
    </fieldset>
    <div className="form-two">
      <div>
        <label><FieldLabel required>Waktu pengamatan</FieldLabel>
          <input type="datetime-local" name="observedAt" required aria-describedby={dateHint} defaultValue={localDate(edit?.report.observedAt)} />
        </label>
        <p className="field-hint" id={dateHint}>Pilih tanggal dan jam saat temuan diamati.</p>
      </div>
      <label><FieldLabel>Dugaan temuan</FieldLabel><select name="finding" defaultValue={edit?.report.finding ?? "unknown"}>
        <option value="unknown">Pilih dugaan temuan bila diketahui</option>
        {Object.entries(findings).filter(([value]) => value !== "unknown").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    <label><FieldLabel>Catatan gejala</FieldLabel><textarea name="notes" rows={3} maxLength={600} defaultValue={edit?.report.notes} placeholder="Contoh: bercak terlihat di tiga rumpun." /></label>
    <LocationFields value={coordinates} onChange={setCoordinates} tiles={tiles} offlineMap={offlineMap} />
    {error && <p className="error-text" role="alert">{error}</p>}
    <button className="primary" disabled={busy || processing}><Save size={17} /> {busy ? "Menyimpan…" : "Simpan laporan"}</button>
  </form>;
}
