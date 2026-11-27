"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { reportInput } from "@/lib/domain";
import { offlineDb, type QueuedReport } from "@/lib/pwa/storage";
import { compressReportPhoto } from "./report-photo";
import type { Coordinates } from "./location-fields";

const blankCoordinates: Coordinates = { longitude: "", latitude: "" };

export function useReportForm({
  ownerId,
  edit,
  onSaved,
}: {
  ownerId: string;
  edit?: QueuedReport;
  onSaved: () => void;
}) {
  const [photo, setPhoto] = useState<Blob | undefined>(edit?.photo);
  const preview = useRef<HTMLImageElement>(null);
  const [coordinates, setCoordinates] = useState<Coordinates>(
    edit ? { longitude: String(edit.report.longitude), latitude: String(edit.report.latitude) } : blankCoordinates,
  );
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
    try {
      setPhoto(await compressReportPhoto(file));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Foto tidak dapat diproses.");
    } finally {
      setProcessing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || processing) return;
    setError("");
    if (!photo) {
      setError("Pilih foto daun sebelum menyimpan.");
      return;
    }
    const fields = new FormData(event.currentTarget);
    const observedAt = new Date(String(fields.get("observedAt")));
    if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > Date.now()) {
      setError("Periksa waktu pengamatan.");
      return;
    }
    const result = reportInput.safeParse({
      id: edit?.id ?? crypto.randomUUID(),
      observedAt: observedAt.toISOString(),
      longitude: Number(coordinates.longitude),
      latitude: Number(coordinates.latitude),
      finding: fields.get("finding"),
      notes: fields.get("notes"),
    });
    if (!result.success) {
      setError("Periksa kembali lokasi dan catatan gejala.");
      return;
    }
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

  return { photo, preview, coordinates, setCoordinates, error, busy, processing, choosePhoto, submit };
}
