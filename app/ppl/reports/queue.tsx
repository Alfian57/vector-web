"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { reportPageResponseSchema } from "@/lib/api-contracts";
import { officerReportCorrectPath, officerReportPath, officerReportsPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { DashboardSkeleton, DashboardState } from "../../_components/dashboard-state";
import { Pagination } from "../../_components/pagination";
import { ReportList } from "../../_components/report-list";
import { ReportFiltersDialog } from "../../_components/report-filters-dialog";
import { useOfficerData } from "../use-ppl-dashboard";
import { reportQueueFilters, reportQueueQuery, withReportQuery } from "./filters";
import { normalizeBrowserPage, pageQueryValue, patchBrowserQuery } from "@/lib/query-state";
import { OfficerReviewDialog } from "./review-dialog";
import { showToast } from "@/app/_components/toast";

export function OfficerQueue() {
  const router = useRouter();
  const search = useSearchParams();
  const filters = reportQueueFilters(search);
  const rawStatus = search.get("status");
  const rawFinding = search.get("finding");
  const rawPage = search.get("page");
  const notice = search.get("notice");
  const lastAnnouncedNotice = useRef<string | null>(null);
  const { status, finding, page } = filters;
  const query = reportQueueQuery(filters);
  const detailQuery = new URLSearchParams(search.toString());
  for (const key of ["status", "finding", "page", "notice"]) detailQuery.delete(key);
  query.forEach((value, key) => detailQuery.set(key, value));
  const apiQuery = new URLSearchParams({ scope: "ppl", status, finding, page: String(page) });
  const { data, issue, retry, loading } = useOfficerData(`reports?${apiQuery}`, reportPageResponseSchema);
  const currentPage =
    data?.totalPages === undefined ? page : data.totalPages > 0 ? Math.min(page, data.totalPages - 1) : 0;

  useEffect(() => {
    const normalizedStatus = status === "pending" ? null : status;
    const normalizedFinding = finding || null;
    const normalizedPage = pageQueryValue(page);
    if (
      rawStatus !== normalizedStatus ||
      rawFinding !== normalizedFinding ||
      rawPage !== normalizedPage
    ) {
      patchBrowserQuery({ status: normalizedStatus, finding: normalizedFinding, page: normalizedPage }, "replace");
    }
  }, [finding, page, rawFinding, rawPage, rawStatus, status]);

  useEffect(() => {
    if (data) normalizeBrowserPage("page", rawPage, currentPage);
  }, [currentPage, data, rawPage]);

  useEffect(() => {
    if (notice !== "review-saved") {
      lastAnnouncedNotice.current = null;
      return;
    }
    if (lastAnnouncedNotice.current === notice) return;
    lastAnnouncedNotice.current = notice;
    showToast("Keputusan verifikasi tersimpan.");
    patchBrowserQuery({ notice: null }, "replace");
  }, [notice]);

  function change(next: Partial<typeof filters>) {
    const patch: Record<string, string | null> = {};
    if (next.status !== undefined) patch.status = next.status === "pending" ? null : next.status;
    if (next.finding !== undefined) patch.finding = next.finding || null;
    if (next.page !== undefined) patch.page = pageQueryValue(next.page);
    patchBrowserQuery(patch);
  }

  function reviewed() {
    const next = new URLSearchParams(search.toString());
    next.delete("notice");
    showToast("Keputusan verifikasi tersimpan.");
    router.replace(withReportQuery(officerReportsPath, next));
    retry();
  }

  return (
    <>
      <div className={tw("page-heading")}>
        <div>
          <h1>Antrean laporan</h1>
          <p>Pilih laporan untuk memeriksa foto dan lokasi.</p>
        </div>
        <div className={tw("button-row")}>
          <ReportFiltersDialog
            filters={{ status, finding }}
            onApply={(next) => change({ status: next.status, finding: next.finding, page: 0 })}
          />
        </div>
      </div>
      <section className={tw("panel")} aria-label="Antrean verifikasi">
        {issue && (
          <DashboardState
            compact
            kind="error"
            title="Antrean belum dapat diperbarui"
            description={issue}
            action={
              <button className={tw("secondary")} onClick={retry}>
                Coba lagi
              </button>
            }
          />
        )}
        {data?.reports.length ? (
          <ReportList
            reports={data.reports}
            busy={loading}
            reviewDialog={(report) => (
              <OfficerReviewDialog
                key={report.id}
                report={report}
                correctionHref={withReportQuery(officerReportCorrectPath(report.id), detailQuery)}
                detailHref={withReportQuery(officerReportPath(report.id), detailQuery)}
                onReviewed={reviewed}
              />
            )}
          />
        ) : loading ? (
          <DashboardSkeleton kind="table" columns={7} label="Memuat laporan…" />
        ) : !issue && (finding || status !== "pending") ? (
          <DashboardState
            kind="filtered"
            title="Tidak ada laporan untuk filter ini"
            action={
              <button className={tw("secondary")} onClick={() => change({ status: "pending", finding: "", page: 0 })}>
                Hapus filter
              </button>
            }
          />
        ) : (
          !issue && (
            <DashboardState
              title="Antrean verifikasi kosong"
              description="Laporan yang perlu ditinjau akan muncul di sini."
            />
          )
        )}
        <Pagination
          label="Halaman antrean laporan"
          page={currentPage}
          hasNext={data?.hasMore ?? false}
          totalPages={data?.totalPages}
          busy={loading}
          onPage={(next) => change({ page: next })}
        />
      </section>
    </>
  );
}
