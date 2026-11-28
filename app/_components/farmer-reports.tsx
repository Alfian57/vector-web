"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { MapPackage } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { tw } from "@/lib/tw";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { Pagination } from "./pagination";
import { ReportCreateDialog } from "./report-create-dialog";
import { ReportFiltersDialog } from "./report-filters-dialog";
import { ReportQueueDialog } from "./report-queue-dialog";
import { ReportList } from "./report-list";
import { showToast } from "./toast";
import type { useFarmerWorkspace } from "./use-farmer-workspace";
import { pageQueryValue, patchBrowserQuery } from "@/lib/query-state";

export function FarmerReports({
  ownerId,
  tiles,
  offlineMap,
  online,
  queue,
  queueReady,
  queueIssue,
  sent,
  syncing,
  syncCurrentPage,
  discard,
  discarding,
  discardIssue,
  discardReport,
  cancelDiscard,
  confirmDiscard,
  reports,
  reportFilters,
  applyReportFilters,
  reportsLoading,
  page,
  more,
  totalPages,
  loadReports,
  listIssue,
}: ReturnType<typeof useFarmerWorkspace> & {
  ownerId: string;
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createFormInstance, setCreateFormInstance] = useState(0);
  const createFormInstanceRef = useRef(0);

  function setCreateDialogOpen(open: boolean) {
    setCreateOpen(open);
    if (open) {
      setCreateFormInstance((instance) => instance + 1);
      createFormInstanceRef.current += 1;
    }
  }

  const openDialogFromHash = useEffectEvent(() => {
    if (window.location.hash === "#buat-laporan") {
      setCreateDialogOpen(true);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    }
  });
  const hasActiveFilters = Boolean(reportFilters.status || reportFilters.finding);

  useEffect(() => {
    function onHashChange() {
      openDialogFromHash();
    }

    openDialogFromHash();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <div className={tw("page-heading")}>
        <div>
          <h1>Laporan saya</h1>
          <p>Pantau laporan dari perangkat hingga verifikasi PPL.</p>
        </div>
        <div className={tw("button-row")}>
          <ReportFiltersDialog filters={reportFilters} onApply={applyReportFilters} disabled={!online} />
          <ReportQueueDialog
            online={online}
            queue={queue}
            queueReady={queueReady}
            queueIssue={queueIssue}
            sent={sent}
            syncing={syncing}
            syncCurrentPage={syncCurrentPage}
            discard={discard}
            discarding={discarding}
            discardIssue={discardIssue}
            discardReport={discardReport}
            cancelDiscard={cancelDiscard}
            confirmDiscard={confirmDiscard}
          />
          <ReportCreateDialog
            open={createOpen}
            onOpenChange={setCreateDialogOpen}
            formInstance={createFormInstance}
            ownerId={ownerId}
            tiles={tiles}
            offlineMap={offlineMap}
            isCurrentForm={(instance) => instance === createFormInstanceRef.current}
            onSaved={() => {
              showToast("Laporan tersimpan di perangkat.");
              if (online) syncCurrentPage();
            }}
          />
        </div>
      </div>
      <section className={tw("panel")} aria-label="Laporan terkirim">
        {!online && (
          <DashboardState
            compact
            kind="offline"
            title={
              reports
                ? "Status terakhir saat terhubung. Buka kembali saat daring untuk pembaruan."
                : "Riwayat laporan terkirim tersedia saat perangkat terhubung."
            }
          />
        )}
        {online && listIssue && (
          <DashboardState
            compact
            kind="error"
            title="Status laporan terbaru belum tersedia"
            description="Periksa koneksi Anda."
            action={
              <button className={tw("secondary")} onClick={() => void loadReports(page)}>
                Coba lagi
              </button>
            }
          />
        )}
        <div className="dashboard-report-list">
          {reports ? (
            reportsLoading && !reports.length ? (
              <DashboardSkeleton label="Memuat laporan…" kind="table" columns={6} />
            ) : reports.length === 0 && hasActiveFilters ? (
              <DashboardState
                kind="filtered"
                title="Tidak ada laporan yang cocok"
                action={
                  <button
                    type="button"
                    className={tw("secondary")}
                    disabled={!online}
                    onClick={() => applyReportFilters({ status: "", finding: "" })}
                  >
                    Hapus filter
                  </button>
                }
              />
            ) : (
              <ReportList reports={reports} busy={reportsLoading} />
            )
          ) : (
            online && !listIssue && <DashboardSkeleton label="Memuat laporan…" kind="table" columns={6} />
          )}
        </div>
        <Pagination
          label="Halaman laporan terkirim"
          page={page}
          totalPages={totalPages}
          hasNext={more}
          busy={!online || reportsLoading}
          onPage={(nextPage) => patchBrowserQuery({ page: pageQueryValue(nextPage) })}
        />
      </section>
    </>
  );
}
