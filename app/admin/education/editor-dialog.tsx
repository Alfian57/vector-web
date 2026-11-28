"use client";

import type { FormEvent, RefObject } from "react";
import { FieldLabel } from "@/app/_components/field-label";
import { tw } from "@/lib/tw";

export function EducationEditorDialog({
  dialogRef,
  dialogTrigger,
  mode,
  busy,
  error,
  linkHref,
  setLinkHref,
  editingLink,
  editorReady,
  onArchive,
  onInsertLink,
  onRemoveLink,
  onClose,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  dialogTrigger: RefObject<HTMLButtonElement | null>;
  mode: "archive" | "link" | null;
  busy: boolean;
  error: string;
  linkHref: string;
  setLinkHref: (value: string) => void;
  editingLink: boolean;
  editorReady: boolean;
  onArchive: () => void;
  onInsertLink: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveLink: () => void;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className={tw("admin-editor-dialog")}
      aria-labelledby="education-editor-dialog-title"
      onClose={() => {
        onClose();
        dialogTrigger.current?.focus();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {mode === "archive" && (
        <div className={tw("admin-editor-dialog-content")}>
          <h2 id="education-editor-dialog-title">Arsipkan artikel?</h2>
          <p>Artikel ini tidak lagi tampil untuk publik. Anda dapat memulihkannya sebagai draf nanti.</p>
          {error && (
            <p className={tw("admin-feedback error")} role="alert">
              {error}
            </p>
          )}
          <div className={tw("admin-editor-dialog-actions")}>
            <button type="button" className={tw("secondary")} data-dialog-cancel disabled={busy} onClick={onClose}>
              Batal
            </button>
            <button type="button" className={tw("danger")} disabled={busy} onClick={onArchive}>
              {busy ? "Mengarsipkan…" : "Arsipkan artikel"}
            </button>
          </div>
        </div>
      )}
      {mode === "link" && (
        <form className={tw("admin-editor-dialog-form")} onSubmit={onInsertLink}>
          <h2 id="education-editor-dialog-title">{editingLink ? "Sunting tautan" : "Sisipkan tautan"}</h2>
          <label>
            <FieldLabel required>Alamat tautan</FieldLabel>
            <input
              type="url"
              required
              autoComplete="url"
              placeholder="https://contoh.id/panduan"
              value={linkHref}
              onChange={(event) => setLinkHref(event.target.value)}
            />
          </label>
          {error && <p className={tw("admin-feedback error")} role="alert">{error}</p>}
          <div className={tw("admin-editor-dialog-actions")}>
            {editingLink && (
              <button type="button" className={tw("secondary")} onClick={onRemoveLink}>
                Hapus tautan
              </button>
            )}
            <button type="button" className={tw("secondary")} data-dialog-cancel onClick={onClose}>
              Batal
            </button>
            <button type="submit" className={tw("primary")} disabled={!editorReady}>
              {editingLink ? "Simpan tautan" : "Sisipkan tautan"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
