"use client";

import { EditorContent } from "@tiptap/react";
import type { EducationArticle, EducationArticleSummary } from "@/lib/domain";
import { useEducationEditor } from "./use-education-editor";
import { tw } from "@/lib/tw";

function statusLabel(value: string) {
  return value === "published" ? "Terbit" : value === "archived" ? "Arsip" : "Draf";
}

export function EducationEditor({
  initial,
  initialHasMore,
  initialSelected = null,
}: {
  initial: EducationArticleSummary[];
  initialHasMore: boolean;
  initialSelected?: EducationArticle | null;
}) {
  const {
    articles,
    hasMore,
    articlePage,
    selected,
    title,
    setTitle,
    category,
    setCategory,
    summary,
    setSummary,
    busy,
    message,
    error,
    filter,
    setFilter,
    dialogMode,
    dialogError,
    linkHref,
    setLinkHref,
    formRef,
    dialogRef,
    dialogTrigger,
    editor,
    refresh,
    selectArticle,
    save,
    archive,
    restore,
    uploadImage,
    insertLink,
    closeDialog,
    startNewArticle,
    openLinkDialog,
    openArchiveDialog,
  } = useEducationEditor({ initial, initialHasMore, initialSelected });

  return (
    <div className={tw("admin-editor-layout")}>
      <section className={tw("admin-panel")}>
        <header className={tw("admin-section-title")}>
          <div>
            <h2>Daftar artikel</h2>
            <p>{articles.length} artikel pada halaman ini</p>
          </div>
          <button className={tw("secondary")} disabled={busy} onClick={startNewArticle}>
            Artikel baru
          </button>
        </header>
        <div className={tw("admin-toolbar")}>
          <label>
            Status <span>(opsional)</span>
            <select
              value={filter}
              disabled={busy}
              onChange={(event) => {
                setFilter(event.target.value);
                void refresh(0, false, event.target.value);
              }}
            >
              <option value="all">Semua status</option>
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
              <option value="archived">Arsip</option>
            </select>
          </label>
        </div>
        <div className={tw("admin-article-list")}>
          {articles.map((article) => (
            <button
              className={tw("admin-article-pick")}
              key={article.id}
              aria-current={selected?.id === article.id}
              onClick={() => void selectArticle(article)}
              disabled={busy}
            >
              <strong>{article.title}</strong>
              <span>
                {article.category} · {statusLabel(article.status)}
              </span>
            </button>
          ))}
          {!articles.length && <p className={tw("admin-help")}>Belum ada artikel pada status ini.</p>}
          {hasMore && (
            <button className={tw("secondary")} onClick={() => void refresh(articlePage + 1, true)}>
              Muat artikel berikutnya
            </button>
          )}
        </div>
      </section>

      <section className={tw("admin-panel admin-article-editor")}>
        <div className={tw("admin-section-title")} style={{ margin: "-18px -18px 17px" }}>
          <div>
            <h2>{selected ? "Sunting artikel" : "Artikel baru"}</h2>
            <p>{selected ? `Tautan: /edukasi/${selected.slug}` : "Lengkapi informasi sebelum menyimpan."}</p>
          </div>
          {selected && <span className={tw("admin-badge")}>{statusLabel(selected.status)}</span>}
        </div>
        {(message || error) && (
          <p className={tw(`admin-feedback ${error ? "error" : ""}`)} role={error ? "alert" : "status"}>
            {error || message}
          </p>
        )}
        <form ref={formRef} className={tw("admin-form")} onSubmit={(event) => event.preventDefault()}>
          <label>
            Judul <span className={tw("admin-required")}>*</span>
            <input
              required
              minLength={5}
              maxLength={120}
              placeholder="Contoh: Mengenali gejala awal blas pada padi"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Kategori <span className={tw("admin-required")}>*</span>
            <input
              required
              minLength={2}
              maxLength={50}
              placeholder="Contoh: Hama dan penyakit"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>
          <label>
            Ringkasan <span className={tw("admin-required")}>*</span>
            <textarea
              required
              minLength={20}
              maxLength={300}
              placeholder="Tuliskan gambaran isi panduan dalam 1–2 kalimat."
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
          <div>
            <span className={tw("admin-field-label")}>
              Isi panduan <span className={tw("admin-required")}>*</span>
            </span>
            <span className={tw("admin-help")}>
              Gunakan heading dan daftar agar langkah mudah dibaca. Cantumkan sumber rujukan di dalam naskah.
            </span>
          </div>
          <div className={tw("editor-toolbar")} role="toolbar" aria-label="Pemformatan artikel">
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>
              Tebal
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>
              Miring
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
              Judul bagian
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
              Daftar
            </button>
            <button type="button" onClick={(event) => openLinkDialog(event.currentTarget)}>
              Tautan
            </button>
            <button type="button" onClick={() => editor?.chain().focus().unsetLink().run()}>
              Hapus tautan
            </button>
          </div>
          <EditorContent editor={editor} />
          <label>
            Gambar artikel <span>(opsional)</span>
            <input
              type="file"
              placeholder="Pilih gambar untuk artikel"
              title="Pilih gambar JPEG, PNG, atau WebP hingga 5 MB"
              aria-describedby="education-image-help"
              accept="image/jpeg,image/png,image/webp"
              disabled={!selected || selected.status === "archived" || busy}
              onChange={(event) => {
                void uploadImage(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <span id="education-image-help" className={tw("admin-help")}>
              Simpan draf terlebih dahulu untuk mengunggah gambar. JPEG, PNG, atau WebP hingga 5 MB.
            </span>
          </label>
          <div className={tw("admin-row-actions")}>
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
                  {busy ? "Menyimpan…" : "Simpan draf"}
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
      </section>

      <dialog
        ref={dialogRef}
        className={tw("admin-editor-dialog")}
        aria-labelledby="education-editor-dialog-title"
        onClose={() => {
          closeDialog();
          dialogTrigger.current?.focus();
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        {dialogMode === "archive" && (
          <div className={tw("admin-editor-dialog-content")}>
            <h2 id="education-editor-dialog-title">Arsipkan artikel?</h2>
            <p>Artikel ini tidak lagi tampil untuk publik. Anda dapat memulihkannya sebagai draf nanti.</p>
            {dialogError && (
              <p className={tw("admin-feedback error")} role="alert">
                {dialogError}
              </p>
            )}
            <div className={tw("admin-editor-dialog-actions")}>
              <button
                type="button"
                className={tw("secondary")}
                data-dialog-cancel
                disabled={busy}
                onClick={closeDialog}
              >
                Batal
              </button>
              <button type="button" className={tw("danger")} disabled={busy} onClick={() => void archive()}>
                {busy ? "Mengarsipkan…" : "Arsipkan artikel"}
              </button>
            </div>
          </div>
        )}
        {dialogMode === "link" && (
          <form className={tw("admin-editor-dialog-form")} onSubmit={insertLink}>
            <h2 id="education-editor-dialog-title">Sisipkan tautan</h2>
            <label>
              Alamat tautan <span className={tw("admin-required")}>*</span>
              <input
                type="url"
                required
                autoComplete="url"
                placeholder="https://contoh.id/panduan"
                value={linkHref}
                onChange={(event) => setLinkHref(event.target.value)}
              />
            </label>
            <div className={tw("admin-editor-dialog-actions")}>
              <button type="button" className={tw("secondary")} data-dialog-cancel onClick={closeDialog}>
                Batal
              </button>
              <button type="submit" className={tw("primary")} disabled={!editor}>
                Sisipkan tautan
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
