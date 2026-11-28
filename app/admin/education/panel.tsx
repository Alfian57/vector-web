"use client";

import { Dialog } from "@base-ui/react/dialog";
import dynamic from "next/dynamic";
import { ActionIcon } from "@/app/_components/action-icon";
import { DashboardSkeleton, DashboardState } from "@/app/_components/dashboard-state";
import { DataTable } from "@/app/_components/data-table";
import { Pagination } from "@/app/_components/pagination";
import Link from "next/link";
import { apiData, ApiError } from "@/lib/client";
import { educationArticleSchema } from "@/lib/api-contracts";
import type { EducationArticle, EducationArticleSummary, EducationStatus } from "@/lib/domain";
import { adminEducationPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EducationFiltersDialog } from "./filters-dialog";
import { browserQueryHref, pageQueryValue } from "@/lib/query-state";
import { showToast } from "@/app/_components/toast";

const EducationEditor = dynamic(() => import("./editor").then((module) => module.EducationEditor), {
  ssr: false,
  loading: () => <DashboardSkeleton kind="editor" label="Memuat editor artikel…" />,
});

const statuses: Record<EducationStatus, string> = { draft: "Draf", published: "Terbit", archived: "Arsip" };

type EducationPageHref = { page: number; href: string };

export function EducationPanel({
  entries,
  status,
  page,
  hasMore,
  totalPages,
  pageHrefs,
  initialSelectedArticle,
  initialCreateOpen,
  initialNotice = "",
}: {
  entries: EducationArticleSummary[];
  status: "" | EducationStatus;
  page: number;
  hasMore: boolean;
  totalPages: number;
  pageHrefs: EducationPageHref[];
  initialSelectedArticle: EducationArticle | null;
  initialCreateOpen: boolean;
  initialNotice?: string;
}) {
  const router = useRouter();
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(
    initialSelectedArticle ? "edit" : initialCreateOpen ? "create" : null,
  );
  const [selectedArticle, setSelectedArticle] = useState<EducationArticle | null>(initialSelectedArticle);
  const [openingId, setOpeningId] = useState("");
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [articleIssue, setArticleIssue] = useState("");
  const request = useRef<AbortController | null>(null);
  const lastAnnouncedNotice = useRef("");
  const closeButton = useRef<HTMLButtonElement>(null);
  const editorOpen = editorMode !== null;

  useEffect(() => {
    const href = browserQueryHref({
      status: status || null,
      page: pageQueryValue(page),
      notice: initialNotice ? null : undefined,
    });
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (href !== current) router.replace(href, { scroll: false });
  }, [initialNotice, page, router, status]);

  useEffect(() => {
    if (!initialNotice) {
      lastAnnouncedNotice.current = "";
      return;
    }
    if (lastAnnouncedNotice.current === initialNotice) return;
    lastAnnouncedNotice.current = initialNotice;
    showToast(initialNotice);
  }, [initialNotice]);

  function clearEditorQuery() {
    const url = new URL(window.location.href);
    const current = `${url.pathname}${url.search}${url.hash}`;
    url.searchParams.delete("edit");
    url.searchParams.delete("create");
    url.searchParams.delete("notice");
    const href = `${url.pathname}${url.search}`;
    const changed = href !== current;
    if (changed) router.replace(href, { scroll: false });
    return changed;
  }

  function closeEditor() {
    request.current?.abort();
    request.current = null;
    setEditorMode(null);
    setSelectedArticle(null);
    setOpeningId("");
    setLoadingArticle(false);
    setArticleIssue("");
    clearEditorQuery();
  }

  function openCreate() {
    request.current?.abort();
    request.current = null;
    setSelectedArticle(null);
    setOpeningId("");
    setArticleIssue("");
    setEditorMode("create");
    const url = new URL(window.location.href);
    url.searchParams.set("create", "1");
    url.searchParams.delete("notice");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  async function openEdit(id: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setEditorMode("edit");
    setSelectedArticle(null);
    setOpeningId(id);
    setLoadingArticle(true);
    setArticleIssue("");
    try {
      const article = await apiData(`admin/education/${encodeURIComponent(id)}`, educationArticleSchema, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setSelectedArticle(article);
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setArticleIssue(error instanceof ApiError ? error.message : "Artikel belum dapat dibuka.");
      }
    } finally {
      if (!controller.signal.aborted) setLoadingArticle(false);
    }
  }

  function finishEditor(message: string) {
    showToast(message);
    const changed = clearEditorQuery();
    setEditorMode(null);
    setSelectedArticle(null);
    setOpeningId("");
    if (!changed) router.refresh();
  }

  function continueEditingDraft(articleId: string) {
    showToast("Draf artikel berhasil disimpan.");
    const url = new URL(window.location.href);
    url.searchParams.delete("create");
    url.searchParams.set("edit", articleId);
    url.searchParams.delete("notice");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  return (
    <>
      <div className="dashboard-education-toolbar">
        <EducationFiltersDialog
          status={status}
          onApply={(nextStatus) =>
            router.push(browserQueryHref({ status: nextStatus || null, page: null }), { scroll: false })
          }
        />
        <button type="button" className={tw("primary")} onClick={openCreate}>
          <Plus size={16} aria-hidden="true" /> Artikel baru
        </button>
      </div>
      <section className={tw("admin-panel")} aria-label="Daftar artikel">
        {entries.length ? (
        <DataTable label="Daftar artikel" columns={["Judul", "Kategori", "Status", "Aksi"]}>
            {entries.map((article) => (
              <tr key={article.id}>
                <td>
                  <strong>{article.title}</strong>
                </td>
                <td>{article.category}</td>
                <td>
                  <span className={tw("admin-badge")}>{statuses[article.status]}</span>
                </td>
                <td>
                  <ActionIcon
                    onClick={() => void openEdit(article.id)}
                    label="Sunting artikel"
                    icon="pencil"
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : status ? (
          <DashboardState
            kind="filtered"
            title="Belum ada artikel pada status ini"
            action={
              <Link className={tw("secondary")} href={adminEducationPath}>
                Hapus filter
              </Link>
            }
          />
        ) : (
          <DashboardState title="Belum ada artikel" description="Artikel yang dibuat akan tampil dalam daftar ini." />
        )}
        <Pagination
          label="Halaman artikel edukasi"
          page={page}
          hasNext={hasMore}
          totalPages={totalPages}
          pageHrefs={pageHrefs}
        />
      </section>

      <Dialog.Root
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="dashboard-backdrop" />
          <Dialog.Viewport className="dashboard-dialog-viewport">
            <Dialog.Popup
              className="dashboard-theme dashboard-dialog dashboard-form-dialog dashboard-education-editor-dialog"
              initialFocus={closeButton}
            >
              <header className="dashboard-form-dialog-heading">
                <div>
                  <Dialog.Title className="dashboard-form-dialog-title">
                    {editorMode === "create" ? "Artikel baru" : "Sunting artikel"}
                  </Dialog.Title>
                  <Dialog.Description className="dashboard-form-dialog-description">
                    {editorMode === "create"
                      ? "Lengkapi informasi dan isi panduan sebelum menyimpan."
                      : selectedArticle?.title ?? "Membuka isi artikel…"}
                  </Dialog.Description>
                </div>
                <Dialog.Close ref={closeButton} className="dashboard-icon-control" aria-label="Tutup editor artikel">
                  <X size={18} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {editorMode === "edit" && loadingArticle && (
                <DashboardSkeleton kind="editor" label="Memuat artikel…" />
              )}
              {editorMode === "edit" && articleIssue && (
                <DashboardState
                  kind="error"
                  title="Artikel belum dapat dibuka"
                  description={articleIssue}
                  action={
                    <button type="button" className={tw("secondary")} onClick={() => void openEdit(openingId)}>
                      Coba lagi
                    </button>
                  }
                  compact
                />
              )}
              {(editorMode === "create" || selectedArticle) && (
                <EducationEditor
                  key={editorMode === "edit" ? selectedArticle?.id : "new-article"}
                  initialSelected={editorMode === "edit" ? selectedArticle : null}
                  onComplete={finishEditor}
                  onDraftSaved={continueEditingDraft}
                />
              )}
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
