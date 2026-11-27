"use client";

import { Megaphone } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { FieldLabel } from "../_components/field-label";
import { formatDate, type District, type FollowUp, type FollowUpEntry } from "@/lib/domain";
import { followUpEntrySchema } from "@/lib/api-contracts";
import { StaffHistory } from "./history";
import { tw } from "@/lib/tw";

export function ActionsPanel({
  id,
  districts,
  followUps,
  revision,
  onChange,
}: {
  id: string;
  districts: District[];
  followUps: FollowUp[];
  revision: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(0);
  const attempts = useRef<Partial<Record<"broadcast" | "follow-up", { payload: string; id: string }>>>({});

  async function submit(event: FormEvent<HTMLFormElement>, broadcast: boolean) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setNotice("");
    setIssue("");
    try {
      const input = Object.fromEntries(new FormData(form));
      const kind = broadcast ? "broadcast" : "follow-up";
      const payload = JSON.stringify(input);
      const previous = attempts.current[kind];
      const id = previous?.payload === payload ? previous.id : crypto.randomUUID();
      attempts.current[kind] = { payload, id };
      await api(
        broadcast ? "ppl/broadcasts" : "ppl/follow-ups",
        jsonRequest(broadcast ? "POST" : "PUT", { ...input, id }),
      );
      delete attempts.current[kind];
      if (!broadcast) setSaved((value) => value + 1);
      setNotice(broadcast ? "Siaran dikirim ke kotak masuk wilayah." : "Tindak lanjut tersimpan.");
      form.reset();
      onChange();
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
    <section id={id} className={tw("panel")}>
      <div className={tw("panel-heading")}>
        <div className={tw("section-title")}>
          <Megaphone size={21} />
          <h2>Siaran dan tindak lanjut</h2>
        </div>
      </div>
      {issue && (
        <p className={tw("panel-note error-text")} role="alert">
          {issue}
        </p>
      )}
      {notice && (
        <p className={tw("panel-note")} role="status">
          {notice}
        </p>
      )}
      <div className={tw("form-two officer-actions")}>
        <form className={tw("field-form embedded")} onSubmit={(event) => void submit(event, true)}>
          <h3>Kirim siaran</h3>
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
        <form className={tw("field-form embedded")} onSubmit={(event) => void submit(event, false)}>
          <h3>Catat tindak lanjut</h3>
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
      </div>
      {!!followUps.length && (
        <ul className={tw("list")}>
          {followUps.map((item) => (
            <li key={`${item.districtId}-${item.kind}`}>
              <div>
                <strong>
                  {item.districtName} · {item.kind === "outreach" ? "Penyuluhan" : "Bantuan"}
                </strong>
                <p>{item.note}</p>
                <p>{formatDate(item.updatedAt)} WIB</p>
              </div>
              <span className={tw("tag")}>{item.status === "planned" ? "Direncanakan" : "Selesai"}</span>
            </li>
          ))}
        </ul>
      )}
      <StaffHistory<FollowUpEntry>
        title="Riwayat tindak lanjut"
        path="ppl/follow-ups/history"
        revision={`${revision}-${saved}`}
        schema={followUpEntrySchema}
        entryKey={(entry) => entry.id}
        renderEntry={(entry) => (
          <>
            <div>
              <strong>
                {entry.districtName} · {entry.kind === "outreach" ? "Penyuluhan" : "Bantuan"}
              </strong>
              <p>{entry.note}</p>
              <p>
                {entry.author} · {formatDate(entry.updatedAt)} WIB
              </p>
            </div>
            <span className={tw("tag")}>{entry.status === "planned" ? "Direncanakan" : "Selesai"}</span>
          </>
        )}
      />
    </section>
  );
}
