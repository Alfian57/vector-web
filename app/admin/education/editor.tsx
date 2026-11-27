"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";
import type { EducationArticle, EducationArticleSummary, EducationStatus, Page } from "@/lib/domain";
import { ApiError, api } from "@/lib/client";
import { educationEditorExtensions } from "@/lib/education-editor-extensions";

const blankDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function EducationEditor({ initial, initialHasMore }: { initial: EducationArticleSummary[]; initialHasMore: boolean }) {
  const [articles, setArticles] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [articlePage, setArticlePage] = useState(0);
  const [selected, setSelected] = useState<EducationArticle | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const formRef = useRef<HTMLFormElement>(null);
  const editor = useEditor({
    extensions: educationEditorExtensions,
    content: blankDocument,
    immediatelyRender: false,
    editorProps: { attributes: { class: "education-editor", "aria-label": "Isi panduan" } },
  });

  useEffect(() => {
    setTitle(selected?.title ?? ""); setCategory(selected?.category ?? ""); setSummary(selected?.summary ?? "");
    editor?.commands.setContent((selected?.content as JSONContent | undefined) ?? blankDocument);
  }, [selected, editor]);

  async function refresh(page = 0, append = false, status = filter) {
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (status !== "all") params.set("status", status);
    try {
      const next = await api<Page<EducationArticleSummary>>(`admin/education?${params}`);
      setArticles((current) => append ? [...current, ...next.entries] : next.entries);
      setArticlePage(page); setHasMore(next.hasMore);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Daftar artikel belum dapat dimuat.");
    }
  }

  async function selectArticle(article: EducationArticleSummary) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      setSelected(await api<EducationArticle>(`admin/education/${article.id}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat dibuka.");
    } finally { setBusy(false); }
  }

  async function save(nextStatus: EducationStatus) {
    if (!editor) return;
    if (!formRef.current?.reportValidity()) return;
    if (!editor.getText().trim()) { setError("Isi panduan wajib diisi."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const payload = { title, category, summary, status: nextStatus, content: editor.getJSON() };
      const saved = await api<{ id: string; slug: string; status: EducationStatus }>(selected ? `admin/education/${selected.id}` : "admin/education", {
        method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const updated: EducationArticle = {
        id: saved.id, slug: saved.slug, title: title.trim(), category: category.trim(), summary: summary.trim(),
        content: payload.content as Record<string, unknown>, status: saved.status, author: selected?.author ?? "Admin",
        updatedAt: new Date().toISOString(), publishedAt: saved.status === "published" ? selected?.publishedAt ?? new Date().toISOString() : null,
      };
      setSelected(updated); await refresh();
      setMessage(saved.status === "published" ? "Artikel berhasil diterbitkan dan dapat dibaca publik." : "Draf artikel berhasil disimpan.");
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat disimpan."); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!selected || !window.confirm("Arsipkan artikel ini? Artikel tidak lagi tampil untuk publik.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api(`admin/education/${selected.id}`, { method: "DELETE" });
      setSelected(null); await refresh(); setMessage("Artikel dipindahkan ke arsip.");
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat diarsipkan."); }
    finally { setBusy(false); }
  }

  async function restore() {
    if (!selected || selected.status !== "archived") return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api(`admin/education/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore" }) });
      setSelected(null); setFilter("draft"); await refresh(0, false, "draft"); setMessage("Artikel dipulihkan sebagai draf.");
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat dipulihkan."); }
    finally { setBusy(false); }
  }

  async function uploadImage(file?: File) {
    if (!file || !selected) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.set("image", file);
      const media = await api<{ src: string }>(`admin/education/${selected.id}/images`, { method: "POST", body: form });
      editor?.chain().focus().setImage({ src: media.src, alt: "Gambar panduan edukasi" }).run();
      setMessage("Gambar ditambahkan ke artikel. Simpan perubahan artikel agar gambar tampil ke pembaca.");
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Gambar belum dapat diunggah."); }
    finally { setBusy(false); }
  }

  const statusLabel = (value: string) => value === "published" ? "Terbit" : value === "archived" ? "Arsip" : "Draf";
  return <div className="admin-editor-layout">
    <section className="admin-panel">
      <header className="admin-section-title"><div><h2>Daftar artikel</h2><p>{articles.length} artikel pada halaman ini</p></div><button className="secondary" disabled={busy} onClick={() => { setSelected(null); setError(""); setMessage(""); }}>Artikel baru</button></header>
      <div className="admin-toolbar"><label>Status <span>(opsional)</span><select value={filter} disabled={busy} onChange={(event) => { setFilter(event.target.value); void refresh(0, false, event.target.value); }}><option value="all">Semua status</option><option value="draft">Draf</option><option value="published">Terbit</option><option value="archived">Arsip</option></select></label></div>
      <div className="admin-article-list">{articles.map((article) => <button className="admin-article-pick" key={article.id} aria-current={selected?.id === article.id} onClick={() => void selectArticle(article)} disabled={busy}>
        <strong>{article.title}</strong><span>{article.category} · {statusLabel(article.status)}</span>
      </button>)}{!articles.length && <p className="admin-help">Belum ada artikel pada status ini.</p>}{hasMore && <button className="secondary" onClick={() => void refresh(articlePage + 1, true)}>Muat artikel berikutnya</button>}</div>
    </section>
    <section className="admin-panel admin-article-editor">
      <div className="admin-section-title" style={{ margin: "-18px -18px 17px" }}><div><h2>{selected ? "Sunting artikel" : "Artikel baru"}</h2><p>{selected ? `Tautan: /edukasi/${selected.slug}` : "Lengkapi informasi sebelum menyimpan."}</p></div>{selected && <span className="admin-badge">{statusLabel(selected.status)}</span>}</div>
      {(message || error) && <p className={`admin-feedback ${error ? "error" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
      <form ref={formRef} className="admin-form" onSubmit={(event) => event.preventDefault()}>
        <label>Judul <span className="admin-required">*</span><input required minLength={5} maxLength={120} placeholder="Contoh: Mengenali gejala awal blas pada padi" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Kategori <span className="admin-required">*</span><input required minLength={2} maxLength={50} placeholder="Contoh: Hama dan penyakit" value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <label>Ringkasan <span className="admin-required">*</span><textarea required minLength={20} maxLength={300} placeholder="Tuliskan gambaran isi panduan dalam 1–2 kalimat." value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <div><span className="admin-field-label">Isi panduan <span className="admin-required">*</span></span><span className="admin-help">Gunakan heading dan daftar agar langkah mudah dibaca. Cantumkan sumber rujukan di dalam naskah.</span></div>
        <div className="editor-toolbar" role="toolbar" aria-label="Pemformatan artikel">
          <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>Tebal</button><button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>Miring</button>
          <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>Judul bagian</button><button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>Daftar</button>
          <button type="button" onClick={() => { const href = window.prompt("Alamat sumber (HTTPS)"); if (href) editor?.chain().focus().setLink({ href }).run(); }}>Tautan</button>
          <button type="button" onClick={() => editor?.chain().focus().unsetLink().run()}>Hapus tautan</button>
        </div>
        <EditorContent editor={editor} />
        <label>Gambar artikel <span>(opsional)</span><input type="file" placeholder="Pilih gambar untuk artikel" title="Pilih gambar JPEG, PNG, atau WebP hingga 5 MB" aria-describedby="education-image-help" accept="image/jpeg,image/png,image/webp" disabled={!selected || selected.status === "archived" || busy} onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /><span id="education-image-help" className="admin-help">Simpan draf terlebih dahulu untuk mengunggah gambar. JPEG, PNG, atau WebP hingga 5 MB.</span></label>
        <div className="admin-row-actions">{selected?.status === "archived" ? <button type="button" className="primary" disabled={busy} onClick={() => void restore()}>Pulihkan sebagai draf</button> : <><button type="button" className="secondary" disabled={busy || !editor} onClick={() => void save("draft")}>{busy ? "Menyimpan…" : "Simpan draf"}</button><button type="button" className="primary" disabled={busy || !editor} onClick={() => void save("published")}>Terbitkan</button>{selected && <button type="button" className="danger" disabled={busy} onClick={() => void archive()}>Arsipkan</button>}</>}</div>
      </form>
    </section>
  </div>;
}
