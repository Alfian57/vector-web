"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ListTodo, RefreshCw, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { findings, formatDate } from "@/lib/domain";
import { dashboardPageSize } from "@/lib/pagination";
import { radarReportEditPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { ActionIcon } from "./action-icon";
import { DashboardConfirmation } from "./dashboard-confirmation";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { DataTable } from "./data-table";
import { Pagination } from "./pagination";
import type { useFarmerWorkspace } from "./use-farmer-workspace";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

type QueueWorkspace = Pick<
  ReturnType<typeof useFarmerWorkspace>,
  | "online"
  | "queue"
  | "queueReady"
  | "queueIssue"
  | "sent"
  | "syncing"
  | "syncCurrentPage"
  | "discard"
  | "discarding"
  | "discardIssue"
  | "discardReport"
  | "cancelDiscard"
  | "confirmDiscard"
>;

export function ReportQueueDialog({
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
}: QueueWorkspace) {
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const rawPage = search.get("queuePage");
  const page = parsePageIndex(rawPage);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const totalPages = Math.ceil(queue.length / dashboardPageSize);

  useEffect(() => {
    normalizeBrowserPage(
      "queuePage",
      rawPage,
      queueReady ? (totalPages > 0 ? Math.min(page, totalPages - 1) : 0) : page,
    );
  }, [page, queueReady, rawPage, totalPages]);

  const openFromHash = useEffectEvent(() => {
    if (window.location.hash === "#antrean-perangkat") setOpen(true);
  });

  useEffect(() => {
    function onHashChange() {
      openFromHash();
    }
    openFromHash();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger
        ref={trigger}
        id="antrean-perangkat"
        className={tw("secondary")}
        aria-label={queueReady ? `Buka antrean perangkat, ${queue.length} laporan tersimpan` : "Buka antrean perangkat"}
      >
        <ListTodo size={16} aria-hidden="true" /> Antrean perangkat
        {queueReady && <span className="dashboard-queue-count">{queue.length}</span>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="dashboard-backdrop" />
        <Dialog.Viewport className="dashboard-dialog-viewport">
          <Dialog.Popup
            className="dashboard-theme dashboard-dialog dashboard-queue-dialog"
            initialFocus={close}
            finalFocus={trigger}
          >
            <header className="dashboard-queue-heading">
              <div>
                <Dialog.Title className="dashboard-queue-title">Antrean perangkat</Dialog.Title>
                <Dialog.Description className="dashboard-queue-description">
                  {queue.length} tersimpan · {sent} terkirim dari perangkat ini
                </Dialog.Description>
              </div>
              <div className="dashboard-queue-controls">
                <button
                  type="button"
                  className="dashboard-icon-control dashboard-queue-sync"
                  onClick={syncCurrentPage}
                  disabled={!online || syncing}
                  aria-label={syncing ? "Menyinkronkan antrean" : "Sinkronkan antrean"}
                  title={syncing ? "Menyinkronkan antrean" : "Sinkronkan antrean"}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
                <Dialog.Close ref={close} className="dashboard-icon-control" aria-label="Tutup antrean perangkat">
                  <X size={18} aria-hidden="true" />
                </Dialog.Close>
              </div>
            </header>
            <div className="dashboard-queue-body">
              {!online && queue.length > 0 && (
                <DashboardState
                  compact
                  kind="offline"
                  title="Laporan tetap tersimpan di perangkat."
                  description="Sambungkan ke internet untuk menyinkronkannya."
                />
              )}
              {queue.length ? (
                <>
                  <DataTable label="Antrean perangkat" columns={["Temuan", "Waktu", "Status", "Aksi"]}>
                    {queue.slice(page * dashboardPageSize, (page + 1) * dashboardPageSize).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{findings[item.report.finding]}</strong>
                        </td>
                        <td>{formatDate(item.report.observedAt)} WIB</td>
                        <td className={tw(item.error ? "error-text" : undefined)}>
                          {item.error ?? "Menunggu sinkronisasi"}
                        </td>
                        <td>
                          {item.error && (
                            <div className="dashboard-action-group">
                              <ActionIcon href={radarReportEditPath(item.id)} label="Perbaiki laporan" icon="pencil" />
                              <ActionIcon onClick={() => discardReport(item.id)} label="Hapus laporan" icon="trash" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                  <Pagination
                    label="Halaman antrean perangkat"
                    page={totalPages > 0 ? Math.min(page, totalPages - 1) : 0}
                    hasNext={page < totalPages - 1}
                    totalPages={totalPages}
                    busy={syncing || discarding}
                    onPage={(nextPage) => patchBrowserQuery({ queuePage: pageQueryValue(nextPage) })}
                  />
                </>
              ) : queueIssue ? (
                <DashboardState
                  kind="error"
                  title="Antrean perangkat belum dapat dibuka."
                  action={
                    <button className={tw("secondary")} onClick={syncCurrentPage} disabled={!online || syncing}>
                      Coba lagi
                    </button>
                  }
                />
              ) : queueReady ? (
                <DashboardState
                  title="Antrean kosong."
                  description="Laporan yang menunggu sinkronisasi akan tampil di sini."
                />
              ) : (
                <DashboardSkeleton label="Memuat antrean…" kind="table" columns={4} />
              )}
            </div>
            {discard && (
              <DashboardConfirmation
                title="Hapus laporan lokal?"
                description="Laporan dan foto yang tersimpan di perangkat akan dihapus."
                busy={discarding}
                issue={discardIssue}
                onCancel={cancelDiscard}
                onConfirm={() => void confirmDiscard()}
                confirmLabel="Hapus laporan"
                pendingLabel="Menghapus…"
              />
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
