"use client";

import { useRef, useState, type FormEvent } from "react";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { tw } from "@/lib/tw";
import { FieldLabel } from "../_components/field-label";
import { showToast } from "../_components/toast";
import { usePplDistricts } from "./use-ppl-dashboard";

export function FollowUpForm({ broadcast = false, onSaved }: { broadcast?: boolean; onSaved?: () => void }) {
  const { districts, issue: districtIssue, retry } = usePplDistricts();
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");
  const attempt = useRef<{ payload: string; id: string }>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const payload = JSON.stringify(values);
    const id = attempt.current?.payload === payload ? attempt.current.id : crypto.randomUUID();
    attempt.current = { payload, id };
    setBusy(true);
    setIssue("");
    try {
      await api(
        broadcast ? "ppl/broadcasts" : "ppl/follow-ups",
        jsonRequest(broadcast ? "POST" : "PUT", { ...values, id }),
      );
      attempt.current = null;
      showToast(broadcast ? "Siaran dikirim ke kotak masuk wilayah." : "Tindak lanjut tersimpan.");
      form.reset();
      onSaved?.();
    } catch (error) {
      setIssue(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const districtOptions = (
    <>
      <option value="" disabled>
        Pilih kecamatan
      </option>
      {districts.map((district) => (
        <option key={district.id} value={district.id}>
          {district.name}
        </option>
      ))}
    </>
  );

  return (
    <>
      {(issue || districtIssue) && (
        <p className={tw("message error-text")} role="alert">
          {issue || districtIssue}{" "}
          {districtIssue && (
            <button className={tw("text-link")} onClick={retry}>
              Coba lagi
            </button>
          )}
        </p>
      )}
      {broadcast ? (
        <form className={tw("field-form embedded")} onSubmit={submit}>
          <label>
            <FieldLabel required>Kecamatan tujuan</FieldLabel>
            <select name="districtId" defaultValue="" required>
              {districtOptions}
            </select>
          </label>
          <label>
            <FieldLabel required>Judul siaran</FieldLabel>
            <input name="title" placeholder="Contoh: Pemantauan padi pekan ini" required maxLength={100} />
          </label>
          <label>
            <FieldLabel required>Isi siaran</FieldLabel>
            <textarea
              name="body"
              placeholder="Contoh: Periksa kondisi tanaman di petak pantauan."
              required
              maxLength={600}
              rows={3}
            />
          </label>
          <button className={tw("primary")} disabled={busy || !districts.length}>
            Kirim siaran
          </button>
        </form>
      ) : (
        <form className={tw("field-form embedded")} onSubmit={submit}>
          <label>
            <FieldLabel required>Kecamatan tindak lanjut</FieldLabel>
            <select name="districtId" defaultValue="" required>
              {districtOptions}
            </select>
          </label>
          <div className={tw("form-two")}>
            <label>
              <FieldLabel required>Jenis</FieldLabel>
              <select name="kind" defaultValue="" required>
                <option value="" disabled>
                  Pilih jenis
                </option>
                <option value="outreach">Penyuluhan</option>
                <option value="assistance">Bantuan</option>
              </select>
            </label>
            <label>
              <FieldLabel required>Status tindak lanjut</FieldLabel>
              <select name="status" defaultValue="" required>
                <option value="" disabled>
                  Pilih status
                </option>
                <option value="planned">Direncanakan</option>
                <option value="complete">Selesai</option>
              </select>
            </label>
          </div>
          <label>
            <FieldLabel required>Catatan tindak lanjut</FieldLabel>
            <textarea
              name="note"
              placeholder="Contoh: Kunjungan lapangan pada hari Senin."
              required
              maxLength={600}
              rows={3}
            />
          </label>
          <button className={tw("primary")} disabled={busy || !districts.length}>
            Simpan tindak lanjut
          </button>
        </form>
      )}
    </>
  );
}
