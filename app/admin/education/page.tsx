import { AdminPageBoundary } from "../page-boundary";
import { notFound } from "next/navigation";
import { uuid } from "@/lib/domain";
import { adminEducationPath } from "@/lib/routes";
import { getEducationForAdmin, listEducationForAdmin } from "@/lib/server/education";
import { RequestError } from "@/lib/server/http";
import { paginationPageNumbers } from "@/lib/pagination";
import { tw } from "@/lib/tw";
import { recordAdminPage } from "../protected-page";
import { EducationPanel } from "./panel";
import { pageQueryValue, parsePageIndex } from "@/lib/query-state";

export default function AdminEducationPage({ searchParams }: PageProps<"/admin/education">) {
  return (
    <AdminPageBoundary label="Memuat artikel edukasi…">
      <AdminEducationContent searchParams={searchParams} />
    </AdminPageBoundary>
  );
}

async function AdminEducationContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/education">["searchParams"];
}) {
  await recordAdminPage(adminEducationPath);
  const query = await searchParams;
  const status =
    query.status === "draft" || query.status === "published" || query.status === "archived" ? query.status : "";
  const inputPage = parsePageIndex(typeof query.page === "string" ? query.page : undefined);
  const editId = typeof query.edit === "string" ? query.edit : "";
  if (editId && !uuid.safeParse(editId).success) notFound();
  const params = new URLSearchParams({ ...(inputPage ? { page: String(inputPage) } : {}), ...(status ? { status } : {}) });
  const [firstPageData, initialSelectedArticle] = await Promise.all([
    listEducationForAdmin(params),
    editId
      ? getEducationForAdmin(editId).catch((error: unknown) => {
          if (error instanceof RequestError && error.status === 404) notFound();
          throw error;
        })
      : Promise.resolve(null),
  ]);
  const pageCount = firstPageData.totalPages ?? 0;
  const page = pageCount > 0 ? Math.min(inputPage, pageCount - 1) : 0;
  const data = page === inputPage
    ? firstPageData
    : await listEducationForAdmin(new URLSearchParams({ ...(page ? { page: String(page) } : {}), ...(status ? { status } : {}) }));

  const routeParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") routeParams.set(key, value);
    else if (value !== undefined) {
      for (const entry of value) routeParams.append(key, entry);
    }
  }

  function listPage(next: number) {
    const nextParams = new URLSearchParams(routeParams);
    const pageValue = pageQueryValue(next);
    if (pageValue) nextParams.set("page", pageValue);
    else nextParams.delete("page");
    const search = nextParams.toString();
    return search ? `${adminEducationPath}?${search}` : adminEducationPath;
  }

  const pageHrefs = paginationPageNumbers(page, data.totalPages, data.hasMore).map((pageIndex) => ({
    page: pageIndex,
    href: listPage(pageIndex),
  }));
  const initialNotice =
    query.notice === "article-archived"
      ? "Artikel dipindahkan ke arsip."
      : query.notice === "article-restored"
        ? "Artikel dipulihkan sebagai draf."
        : query.notice === "article-published"
          ? "Artikel berhasil diterbitkan dan dapat dibaca publik."
          : query.notice === "draft-saved"
            ? "Draf artikel berhasil disimpan."
            : "";

  return (
    <>
      <header className={tw("admin-heading")}>
        <div>
          <h1>Artikel edukasi</h1>
          <p>Kelola materi pengamatan dan panduan yang tersedia di pusat edukasi.</p>
        </div>
      </header>
      <EducationPanel
        key={editId ? `edit:${editId}` : query.create === "1" ? "create" : "list"}
        entries={data.entries}
        status={status}
        page={page}
        hasMore={data.hasMore}
        totalPages={data.totalPages ?? 0}
        pageHrefs={pageHrefs}
        initialSelectedArticle={initialSelectedArticle}
        initialCreateOpen={query.create === "1"}
        initialNotice={initialNotice}
      />
    </>
  );
}
