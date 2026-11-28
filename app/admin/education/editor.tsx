"use client";

import { EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { EducationArticle } from "@/lib/domain";
import { educationImageAccept } from "@/lib/education-images";
import { useEducationEditor } from "./use-education-editor";
import { articleImageIssue } from "./use-article-image-draft";
import { tw } from "@/lib/tw";
import { FieldLabel } from "@/app/_components/field-label";
import { ImageCropDialog } from "@/app/_components/image-crop-dialog";
import { ArticleImageField } from "./article-image-field";
import { EducationEditorDialog } from "./editor-dialog";
import { EducationEditorToolbar } from "./editor-toolbar";

export function EducationEditor({
  initialSelected = null,
  onComplete,
  onDraftSaved,
}: {
  initialSelected?: EducationArticle | null;
  onComplete: (message: string) => void;
  onDraftSaved: (articleId: string) => void;
}) {
  const {
    selected,
    title,
    setTitle,
    category,
    setCategory,
    summary,
    setSummary,
    thumbnailSrc,
    setThumbnail,
    removeThumbnail,
    busy,
    saving,
    error,
    dialogMode,
    dialogError,
    linkHref,
    setLinkHref,
    editingLink,
    formRef,
    dialogRef,
    dialogTrigger,
    editor,
    save,
    archive,
    restore,
    inlineImageInput,
    inlineImageIssue,
    openImagePicker,
    insertImage,
    insertLink,
    removeLink,
    closeDialog,
    openLinkDialog,
    openArchiveDialog,
  } = useEducationEditor(initialSelected, onComplete, onDraftSaved);
  const thumbnailPickerButton = useRef<HTMLButtonElement>(null);
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [imageIssue, setImageIssue] = useState("");

  useEffect(() => {
    if (!imageSource) return;
    return () => URL.revokeObjectURL(imageSource);
  }, [imageSource]);

  function selectArticleImage(file?: File) {
    setImageIssue("");
    if (!file) return;
    const issue = articleImageIssue(file);
    if (issue) {
      setImageIssue(issue);
      return;
    }
    setImageSource(URL.createObjectURL(file));
  }

  async function saveCroppedArticleImage(image: Blob) {
    setThumbnail(image);
    setImageSource(null);
  }

  const archived = selected?.status === "archived";
  const editingDisabled = archived || busy;

  return (
    <>
      <div className={tw("admin-article-editor dashboard-education-editor-content")}>
        {error && (
          <p className={tw("admin-feedback error")} role="alert">
            {error}
          </p>
        )}
        <form ref={formRef} className={tw("admin-form dashboard-education-editor-form")} onSubmit={(event) => event.preventDefault()}>
          <div className={tw("dashboard-education-editor-columns")}>
            <section className={tw("dashboard-education-metadata")} aria-label="Informasi artikel">
              <label>
                <FieldLabel required>Judul</FieldLabel>
                <input
                  required
                  minLength={5}
                  maxLength={120}
                  placeholder="Contoh: Mengenali gejala awal blas pada padi"
                  value={title}
                  disabled={editingDisabled}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                <FieldLabel required>Kategori</FieldLabel>
                <input
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="Contoh: Hama dan penyakit"
                  value={category}
                  disabled={editingDisabled}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </label>
              <label>
                <FieldLabel required>Ringkasan</FieldLabel>
                <textarea
                  required
                  minLength={20}
                  maxLength={300}
                  rows={3}
                  placeholder="Tuliskan gambaran isi panduan dalam 1–2 kalimat."
                  value={summary}
                  disabled={editingDisabled}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </label>
              <ArticleImageField
                source={thumbnailSrc}
                archived={archived}
                busy={busy}
                issue={imageIssue}
                triggerButtonRef={thumbnailPickerButton}
                onFile={selectArticleImage}
                onRemove={() => {
                  removeThumbnail();
                  setImageIssue("");
                }}
              />
            </section>

            <section className={tw("dashboard-education-writing")} aria-label="Isi artikel">
              <header className={tw("dashboard-education-writing-heading")}>
                <div>
                  <span className={tw("admin-field-label")}>
                    Isi panduan <span className={tw("admin-required")}>*</span>
                  </span>
                  {inlineImageIssue && (
                    <span className={tw("error-text")} role="alert">{inlineImageIssue}</span>
                  )}
                  <span className={tw("admin-help")}>
                    Gunakan judul bagian dan daftar agar langkah mudah diikuti. Cantumkan sumber rujukan di dalam naskah.
                  </span>
                </div>
              </header>
              <div className={tw("dashboard-education-writing-surface")}>
                <EducationEditorToolbar
                  editor={editor}
                  disabled={editingDisabled}
                  onInsertLink={openLinkDialog}
                  onInsertImage={openImagePicker}
                />
                <input
                  ref={inlineImageInput}
                  type="file"
                  accept={educationImageAccept}
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void insertImage(file);
                  }}
                />
                <EditorContent className="education-editor" editor={editor} />
              </div>
            </section>
          </div>
          <div className={tw("admin-row-actions dashboard-education-editor-actions")}>
            {selected?.status === "archived" ? (
              <button type="button" className={tw("primary")} disabled={busy} onClick={() => void restore()}>
                Pulihkan sebagai draf
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={tw("secondary")}
                  disabled={busy || !editor}
                  onClick={() => void save("draft")}
                >
                  {saving ? "Menyimpan…" : "Simpan draf"}
                </button>
                <button
                  type="button"
                  className={tw("primary")}
                  disabled={busy || !editor}
                  onClick={() => void save("published")}
                >
                  Terbitkan
                </button>
                {selected && (
                  <button
                    type="button"
                    className={tw("danger")}
                    disabled={busy}
                    onClick={(event) => openArchiveDialog(event.currentTarget)}
                  >
                    Arsipkan
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>

      {imageSource && (
        <ImageCropDialog
          key={imageSource}
          source={imageSource}
          title="Atur thumbnail artikel"
          description="Pilih bagian gambar dengan rasio 16:9. Anda dapat memperbesar atau memutarnya."
          aspect={16 / 9}
          busy={busy}
          saveLabel="Gunakan thumbnail"
          processingLabel="Memotong gambar…"
          onCancel={() => setImageSource(null)}
          onSave={saveCroppedArticleImage}
          finalFocus={thumbnailPickerButton}
        />
      )}

      <EducationEditorDialog
        dialogRef={dialogRef}
        dialogTrigger={dialogTrigger}
        mode={dialogMode}
        busy={busy}
        error={dialogError}
        linkHref={linkHref}
        setLinkHref={setLinkHref}
        editingLink={editingLink}
        editorReady={Boolean(editor)}
        onArchive={() => void archive()}
        onInsertLink={insertLink}
        onRemoveLink={removeLink}
        onClose={closeDialog}
      />
    </>
  );
}
