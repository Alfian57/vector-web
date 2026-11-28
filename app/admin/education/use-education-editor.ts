"use client";

import { useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Selection } from "@tiptap/pm/state";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EducationArticle, EducationStatus } from "@/lib/domain";
import { ApiError, api, apiData } from "@/lib/client";
import { educationSaveResponseSchema } from "@/lib/api-contracts";
import { educationEditorExtensions } from "@/lib/education-editor-extensions";
import { mapEducationImageSources } from "@/lib/education-images";
import { articleImageIssue, useArticleImageDraft } from "./use-article-image-draft";

const blankDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

function positionAfterBlock(selection: Selection) {
  return selection.$to.depth ? selection.$to.after(1) : selection.to;
}

function isArticleLink(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function useEducationEditor(
  initialSelected: EducationArticle | null,
  onComplete: (message: string) => void,
  onDraftSaved: (articleId: string) => void,
) {
  const [selected, setSelected] = useState<EducationArticle | null>(initialSelected);
  const [title, setTitle] = useState(initialSelected?.title ?? "");
  const [category, setCategory] = useState(initialSelected?.category ?? "");
  const [summary, setSummary] = useState(initialSelected?.summary ?? "");
  const [thumbnailSrc, setThumbnailSrc] = useState(initialSelected?.thumbnailSrc ?? null);
  const [saving, setSaving] = useState(false);
  const [insertingImage, setInsertingImage] = useState(false);
  const [error, setError] = useState("");
  const [dialogMode, setDialogMode] = useState<"archive" | "link" | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [editingLink, setEditingLink] = useState(false);
  const [inlineImageIssue, setInlineImageIssue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const inlineImageInput = useRef<HTMLInputElement>(null);
  const imagePosition = useRef<{ doc: ProseMirrorNode; position: number } | null>(null);
  const imageDraft = useArticleImageDraft();
  const archived = selected?.status === "archived";
  const busy = saving || insertingImage;
  const editor = useEditor({
    extensions: educationEditorExtensions,
    content: (initialSelected?.content as JSONContent | undefined) ?? blankDocument,
    immediatelyRender: false,
    editable: !archived,
    editorProps: { attributes: { "aria-label": "Isi panduan" } },
  });

  useEffect(() => {
    editor?.setEditable(!archived && !busy);
  }, [archived, busy, editor]);

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

  async function save(nextStatus: Exclude<EducationStatus, "archived">) {
    if (busy || archived || !editor) return;
    if (!formRef.current?.reportValidity()) return;
    if (!editor.getText().trim()) {
      setError("Isi panduan wajib diisi.");
      return;
    }
    setError("");
    const content = editor.getJSON();
    let submission: ReturnType<typeof imageDraft.prepare>;
    try {
      submission = imageDraft.prepare(
        selected ? "PATCH" : "POST",
        { title, category, summary, status: nextStatus, content },
        thumbnailSrc,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Periksa kembali gambar artikel.");
      return;
    }

    setSaving(true);
    try {
      const saved = await apiData(
        selected ? `admin/education/${selected.id}` : "admin/education",
        educationSaveResponseSchema,
        submission.request,
      );
      const savedSources = new Map<string, string>();
      for (const [source, { reference }] of submission.references) {
        const savedSource = saved.imageSources[reference];
        if (savedSource) savedSources.set(source, savedSource);
      }
      const updated: EducationArticle = {
        id: saved.id,
        slug: saved.slug,
        title: title.trim(),
        category: category.trim(),
        summary: summary.trim(),
        content: mapEducationImageSources(content, (source) => savedSources.get(source) ?? source),
        thumbnailSrc: saved.thumbnailSrc,
        status: saved.status,
        author: selected?.author ?? "",
        updatedAt: new Date().toISOString(),
        publishedAt: saved.status === "published" ? (selected?.publishedAt ?? new Date().toISOString()) : null,
      };
      setSelected(updated);
      if (thumbnailSrc) imageDraft.discard(thumbnailSrc);
      setThumbnailSrc(saved.thumbnailSrc);
      if (!selected && nextStatus === "draft") {
        if (!editor.isDestroyed && savedSources.size) {
          editor.commands.command(({ tr }) => {
            tr.doc.descendants((node, position) => {
              const source: unknown = node.attrs.src;
              const savedSource = typeof source === "string" ? savedSources.get(source) : undefined;
              if (node.type.name === "image" && savedSource) {
                tr.setNodeMarkup(position, undefined, { ...node.attrs, src: savedSource });
              }
            });
            tr.setMeta("addToHistory", false);
            return true;
          });
        }
        onDraftSaved(saved.id);
        return;
      }
      const successMessage =
        saved.status === "published"
          ? "Artikel berhasil diterbitkan dan dapat dibaca publik."
          : "Draf artikel berhasil disimpan.";
      onComplete(successMessage);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat disimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!selected || busy) return;
    setSaving(true);
    setError("");
    try {
      await api(`admin/education/${selected.id}`, { method: "DELETE" });
      setDialogMode(null);
      onComplete("Artikel dipindahkan ke arsip.");
    } catch (cause) {
      const failure = cause instanceof ApiError ? cause.message : "Artikel belum dapat diarsipkan.";
      setError(failure);
      setDialogError(failure);
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    if (!selected || !archived || busy) return;
    setSaving(true);
    setError("");
    try {
      await api(`admin/education/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      onComplete("Artikel dipulihkan sebagai draf.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Artikel belum dapat dipulihkan.");
    } finally {
      setSaving(false);
    }
  }

  function setThumbnail(file: Blob) {
    const source = imageDraft.stageThumbnail(file, thumbnailSrc);
    setThumbnailSrc(source);
  }

  function removeThumbnail() {
    if (thumbnailSrc) imageDraft.discard(thumbnailSrc);
    setThumbnailSrc(null);
  }

  function openImagePicker() {
    if (!editor || archived || busy) return;
    imagePosition.current = { doc: editor.state.doc, position: positionAfterBlock(editor.state.selection) };
    setInlineImageIssue("");
    inlineImageInput.current?.click();
  }

  async function insertImage(file?: File) {
    if (!file || !editor || archived || busy) return;
    const issue = articleImageIssue(file);
    if (issue) {
      setInlineImageIssue(issue);
      return;
    }
    setInsertingImage(true);
    const source = imageDraft.stage(file);
    try {
      const preview = new Image();
      preview.src = source;
      await preview.decode();
      if (editor.isDestroyed) return;
      const savedPosition = imagePosition.current;
      const position =
        savedPosition?.doc === editor.state.doc ? savedPosition.position : positionAfterBlock(editor.state.selection);
      const inserted = editor.chain().focus().insertContentAt(position, { type: "image", attrs: { src: source, alt: "" } }).run();
      if (!inserted) throw new Error("Gambar belum dapat disisipkan pada posisi ini.");
    } catch {
      imageDraft.discard(source);
      setInlineImageIssue("Gambar belum dapat disisipkan. Periksa berkas dan coba lagi.");
    } finally {
      setInsertingImage(false);
    }
  }

  function applyLinkChange(change: () => void) {
    dialogTrigger.current = null;
    dialogRef.current?.close();
    setDialogMode(null);
    change();
  }

  function insertLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = linkHref.trim();
    if (!editor) return;
    if (!isArticleLink(href)) {
      setDialogError("Gunakan alamat tautan yang dimulai dengan http:// atau https://.");
      return;
    }
    applyLinkChange(() => {
      const chain = editor.chain().focus();
      if (!editingLink && editor.state.selection.empty) {
        chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
      } else {
        chain.extendMarkRange("link").setLink({ href }).run();
      }
    });
  }

  function removeLink() {
    if (!editor || !editingLink) return;
    applyLinkChange(() => editor.chain().focus().extendMarkRange("link").unsetLink().run());
  }

  function closeDialog() {
    if (busy) return;
    setDialogMode(null);
    setDialogError("");
  }

  function openLinkDialog(trigger: HTMLButtonElement) {
    dialogTrigger.current = trigger;
    const href: unknown = editor?.getAttributes("link").href;
    setEditingLink(typeof href === "string");
    setLinkHref(typeof href === "string" ? href : "");
    setDialogError("");
    setDialogMode("link");
  }

  function openArchiveDialog(trigger: HTMLButtonElement) {
    dialogTrigger.current = trigger;
    setDialogError("");
    setDialogMode("archive");
  }

  return {
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
  };
}
