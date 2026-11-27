"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { maxAidQuantity } from "@/lib/domain";
import { FieldLabel } from "../_components/field-label";

export function AidForm({ path, button, success, onSaved, disabled = false, correction, originalNote = "", onCancel, children }: {
  path: string;
  button: string;
  success: string;
  onSaved: () => void;
  disabled?: boolean;
  correction?: { target: "allocation" | "delivery" | "void-delivery"; revision: number; deliveryId?: string };
  originalNote?: string;
  onCancel?: () => void;
  children: ReactNode;
}) {
  const lastSubmission = useRef<{ signature: string; id: string }>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [issue, setIssue] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const input = fields.quantity === undefined ? fields : { ...fields, quantity: Number(fields.quantity) };
    const signature = JSON.stringify(input);
    const id = lastSubmission.current?.signature === signature ? lastSubmission.current.id : crypto.randomUUID();
    lastSubmission.current = { signature, id };
    setBusy(true);
    setMessage("");
    setIssue("");
    try {
      await api(path, correction ? jsonRequest("PATCH", { ...input, ...correction }) : jsonRequest("POST", { ...input, id }));
      form.reset();
      lastSubmission.current = null;
      setMessage(success);
      onSaved();
    } catch (error) { setIssue(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <form className="field-form embedded" onSubmit={(event) => void submit(event)}>
    <fieldset disabled={busy || disabled}>
      {children}
      {correction?.target !== "void-delivery" && <label><FieldLabel>Catatan</FieldLabel>
        <textarea name="note" defaultValue={originalNote} placeholder="Contoh: Serah terima di balai desa" maxLength={600} rows={2} /></label>}
      {correction && <label><FieldLabel required>{correction.target === "void-delivery" ? "Alasan pembatalan" : "Alasan koreksi bantuan"}</FieldLabel>
        <textarea name="reason" placeholder="Contoh: Jumlah pada bukti serah terima diperiksa kembali." maxLength={600} rows={2} required /></label>}
      <div className="button-row">
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Batal</button>}
        <button className={correction?.target === "void-delivery" ? "danger" : "primary"}>{busy ? "Menyimpan…" : button}</button>
      </div>
    </fieldset>
    {message && <p className="inline-note" role="status">{message}</p>}
    {issue && <p className="error-text" role="alert">{issue}</p>}
  </form>;
}

export function AidQuantity({ min = 1, max = maxAidQuantity, delivery = false, value }: {
  min?: number; max?: number; delivery?: boolean; value?: number;
}) {
  return <label>
    <FieldLabel required>{delivery ? "Jumlah penyaluran" : "Jumlah alokasi"}</FieldLabel>
    <input name="quantity" type="number" placeholder={delivery ? "Contoh: 10" : "Contoh: 100"} min={min} max={max} step={1} defaultValue={value} required />
  </label>;
}
