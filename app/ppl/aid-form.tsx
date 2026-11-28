"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { FieldLabel } from "../_components/field-label";
import { showToast } from "../_components/toast";
import { tw } from "@/lib/tw";

export { AidQuantity } from "./aid-quantity";

export function AidForm({
  path,
  button,
  success,
  onSaved,
  disabled = false,
  correction,
  originalNote = "",
  onCancel,
  children,
}: {
  path: string;
  button: string;
  success: string;
  onSaved?: () => void;
  disabled?: boolean;
  correction?: { target: "allocation" | "delivery" | "void-delivery"; revision: number; deliveryId?: string };
  originalNote?: string;
  onCancel?: () => void;
  children: ReactNode;
}) {
  const lastSubmission = useRef<{ signature: string; id: string }>(null);
  const [busy, setBusy] = useState(false);
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
    setIssue("");
    let saved = false;
    try {
      await api(
        path,
        correction ? jsonRequest("PATCH", { ...input, ...correction }) : jsonRequest("POST", { ...input, id }),
      );
      form.reset();
      lastSubmission.current = null;
      showToast(success);
      saved = true;
      onSaved?.();
    } catch (error) {
      setIssue(errorMessage(error));
    } finally {
      if (!saved || !onSaved) setBusy(false);
    }
  }

  return (
    <form className={tw("field-form embedded")} onSubmit={(event) => void submit(event)}>
      <fieldset disabled={busy || disabled}>
        {children}
        {correction?.target !== "void-delivery" && (
          <label>
            <FieldLabel>Catatan</FieldLabel>
            <textarea
              name="note"
              defaultValue={originalNote}
              placeholder="Contoh: Serah terima di balai desa"
              maxLength={600}
              rows={2}
            />
          </label>
        )}
        {correction && (
          <label>
            <FieldLabel required>
              {correction.target === "void-delivery"
                ? "Alasan pembatalan"
                : correction.target === "delivery"
                  ? "Alasan koreksi penyaluran"
                  : "Alasan koreksi alokasi"}
            </FieldLabel>
            <textarea
              name="reason"
              placeholder="Contoh: Jumlah pada bukti serah terima diperiksa kembali."
              maxLength={600}
              rows={2}
              required
            />
          </label>
        )}
        <div className={tw("button-row action-row")}>
          {onCancel && (
            <button type="button" className={tw("secondary")} onClick={onCancel}>
              Batal
            </button>
          )}
          <button className={tw(correction?.target === "void-delivery" ? "danger" : "primary")}>
            {busy ? "Menyimpan…" : button}
          </button>
        </div>
      </fieldset>
      {issue && (
        <p className={tw("error-text")} role="alert">
          {issue}
        </p>
      )}
    </form>
  );
}
