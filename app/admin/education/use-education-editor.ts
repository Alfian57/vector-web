"use client";

import { useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EducationArticle, EducationArticleSummary, EducationStatus } from "@/lib/domain";
import { ApiError, api, apiData } from "@/lib/client";
import {
  educationArticleSchema,
  educationImageResponseSchema,
  educationSaveResponseSchema,
  educationArticleSummarySchema,
  pageSchema,
} from "@/lib/api-contracts";
import { educationEditorExtensions } from "@/lib/education-editor-extensions";

const blankDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function useEducationEditor({
  initial,
  initialHasMore,
  initialSelected,
}: {
  initial: EducationArticleSummary[];
  initialHasMore: boolean;
  initialSelected: EducationArticle | null;
}) {
  const [articles, setArticles] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [articlePage, setArticlePage] = useState(0);
  const [selected, setSelected] = useState<EducationArticle | null>(initialSelected);
  const [title, setTitle] = useState(initialSelected?.title ?? "");
  const [category, setCategory] = useState(initialSelected?.category ?? "");
  const [summary, setSummary] = useState(initialSelected?.summary ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogMode, setDialogMode] = useState<"archive" | "link" | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const editor = useEditor({
    extensions: educationEditorExtensions,
    content: blankDocument,
    immediatelyRender: false,
    editorProps: { attributes: { class: "education-editor", "aria-label": "Isi panduan" } },
  });

  useEffect(() => {
    editor?.commands.setContent((selected?.content as JSONContent | undefined) ?? blankDocument);
  }, [selected, editor]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialogMode && dialog && !dialog.open) dialog.showModal();
    if (!dialogMode && dialog?.open) dialog.close();
  }, [dialogMode]);

  useEffect(() => {
    if (!dialogMode) return;
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();
    if (dialogMode === "link") dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [dialogMode]);

  async function refresh(page = 0, append = false, status = filter) {
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (status !== "all") params.set("status", status);
    try {
      const next = await apiData(`admin/education?${params}`, pageSchema(educationArticleSummarySchema));
      setArticles((current) => (append ? [...current, ...next.entries] : next.entries));
      setArticlePage(page);
      setHasMore(next.hasMore);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Daftar artikel belum dapat dimuat.");
    }
  }

  async function selectArticle(article: EducationArticleSummary) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const value = await apiData(`admin/education/${article.id}`, educationArticleSchema);
      setSelected(value);
      setTitle(value.title);
      setCategory(value.category);
      setSummary(value.summary);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat dibuka.");
    } finally {
      setBusy(false);
    }
  }

  async function save(nextStatus: EducationStatus) {
    if (!editor) return;
    if (!formRef.current?.reportValidity()) return;
    if (!editor.getText().trim()) {
      setError("Isi panduan wajib diisi.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = { title, category, summary, status: nextStatus, content: editor.getJSON() };
      const saved = await apiData(
        selected ? `admin/education/${selected.id}` : "admin/education",
        educationSaveResponseSchema,
        {
          method: selected ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const updated: EducationArticle = {
        id: saved.id,
        slug: saved.slug,
        title: title.trim(),
        category: category.trim(),
        summary: summary.trim(),
        content: payload.content as Record<string, unknown>,
        status: saved.status,
        author: selected?.author ?? "Admin",
        updatedAt: new Date().toISOString(),
        publishedAt: saved.status === "published" ? (selected?.publishedAt ?? new Date().toISOString()) : null,
      };
      setSelected(updated);
      await refresh();
      setMessage(
        saved.status === "published"
          ? "Artikel berhasil diterbitkan dan dapat dibaca publik."
          : "Draf artikel berhasil disimpan.",
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`admin/education/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      setTitle("");
      setCategory("");
      setSummary("");
      await refresh();
      setMessage("Artikel dipindahkan ke arsip.");
      setDialogMode(null);
    } catch (cause) {
      const failure = cause instanceof ApiError ? cause.message : "Artikel belum dapat diarsipkan.";
      setError(failure);
      setDialogError(failure);
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!selected || selected.status !== "archived") return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`admin/education/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      setSelected(null);
      setTitle("");
      setCategory("");
      setSummary("");
      setFilter("draft");
      await refresh(0, false, "draft");
      setMessage("Artikel dipulihkan sebagai draf.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat dipulihkan.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file?: File) {
    if (!file || !selected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("image", file);
      const media = await apiData(`admin/education/${selected.id}/images`, educationImageResponseSchema, {
        method: "POST",
        body: form,
      });
      editor?.chain().focus().setImage({ src: media.src, alt: "Gambar panduan edukasi" }).run();
      setMessage("Gambar ditambahkan ke artikel. Simpan perubahan artikel agar gambar tampil ke pembaca.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Gambar belum dapat diunggah.");
    } finally {
      setBusy(false);
    }
  }

  function insertLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = linkHref.trim();
    if (!href || !editor) return;
    setDialogMode(null);
    window.setTimeout(() => editor.chain().focus().setLink({ href }).run(), 0);
  }

  function closeDialog() {
    if (busy) return;
    setDialogMode(null);
    setDialogError("");
  }

  function startNewArticle() {
    setSelected(null);
    setTitle("");
    setCategory("");
    setSummary("");
    setError("");
    setMessage("");
  }

  function openLinkDialog(trigger: HTMLButtonElement) {
    dialogTrigger.current = trigger;
    setLinkHref("");
    setDialogError("");
    setDialogMode("link");
  }

  function openArchiveDialog(trigger: HTMLButtonElement) {
    dialogTrigger.current = trigger;
    setDialogError("");
    setDialogMode("archive");
  }

  return {
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
  };
}
