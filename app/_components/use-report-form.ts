"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { reportInput } from "@/lib/domain";
import { offlineDb, type QueuedReport } from "@/lib/pwa/storage";
import { scheduleReports } from "@/lib/pwa/sync";
import { compressReportPhoto } from "./report-photo";
import type { Coordinates } from "./location-fields";

const blankCoordinates: Coordinates = { longitude: "", latitude: "" };

export function useReportForm({
  ownerId,
  edit,
  onSaved,
  photoTriggerButton,
}: {
  ownerId: string;
  edit?: QueuedReport;
  onSaved: () => void;
  photoTriggerButton: RefObject<HTMLButtonElement | null>;
}) {
  const [photo, setPhoto] = useState<Blob | undefined>(edit?.photo);
  const preview = useRef<HTMLImageElement>(null);
  const [coordinates, setCoordinates] = useState<Coordinates>(
    edit ? { longitude: String(edit.report.longitude), latitude: String(edit.report.latitude) } : blankCoordinates,
  );
  const [issue, setIssue] = useState<{ field: "photo" | "date" | "location" | "form"; message: string }>();
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
    setIssue(undefined);
    setProcessing(true);
    try {
      setPhoto(await compressReportPhoto(file));
    } catch (failure) {
      setIssue({ field: "photo", message: failure instanceof Error ? failure.message : "Foto tidak dapat diproses." });
    } finally {
      setProcessing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || processing) return;
    setIssue(undefined);
    if (!photo) {
      setIssue({ field: "photo", message: "Pilih foto daun sebelum menyimpan." });
      photoTriggerButton.current?.focus();
      return;
    }
    const fields = new FormData(event.currentTarget);
    const observedAt = new Date(String(fields.get("observedAt")));
    if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > Date.now()) {
      setIssue({ field: "date", message: "Waktu pengamatan harus sama dengan atau sebelum waktu sekarang." });
      event.currentTarget.querySelector<HTMLInputElement>('input[name="observedAt"]')?.focus();
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
      const invalidLocation = result.error.issues.some(({ path }) => path[0] === "latitude" || path[0] === "longitude");
      setIssue(
        invalidLocation
          ? { field: "location", message: "Periksa kembali lintang dan bujur lokasi." }
          : { field: "form", message: "Periksa kembali isian temuan dan catatan gejala." },
      );
      if (invalidLocation) event.currentTarget.querySelector<HTMLInputElement>('input[name="latitude"]')?.focus();
      return;
    }
    setBusy(true);
    try {
      const database = offlineDb();
      const queued = { id: result.data.id, ownerId, report: result.data, photo };
      const saved = await database.transaction("rw", database.queue, database.accounts, async () => {
        const active = await database.accounts.get("account");
        if (active?.account.id !== ownerId) return false;
        if (edit) {
          const previous = await database.queue.get(edit.id);
          if (previous?.ownerId !== ownerId || !previous.error) return false;
        }
        await database.queue.put(queued);
        return true;
      });
      if (!saved) {
        setIssue({ field: "form", message: "Laporan atau sesi pemilik sudah berubah. Buka kembali antrean laporan." });
        return;
      }
      await scheduleReports().catch(() => {});
      onSaved();
    } catch {
      setIssue({ field: "form", message: "Laporan belum tersimpan. Periksa ruang penyimpanan perangkat." });
    } finally {
      setBusy(false);
    }
  }

  return { photo, preview, coordinates, setCoordinates, issue, busy, processing, choosePhoto, submit };
}
