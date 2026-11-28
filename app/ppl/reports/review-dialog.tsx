"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useState } from "react";
import { reviewEntrySchema } from "@/lib/api-contracts";
import { findings, formatDate, statuses, type Report, type ReviewEntry } from "@/lib/domain";
import { tw } from "@/lib/tw";
import { ActionIcon } from "../../_components/action-icon";
import { SeverityBadge } from "../../_components/severity-badge";
import { StaffHistory } from "../staff-history";
import { ReviewPanel } from "../review-panel";

export function OfficerReviewDialog({
  report,
  correctionHref,
  detailHref,
  onReviewed,
}: {
  report: Report;
  correctionHref: string;
  detailHref: string;
  onReviewed: () => void;
}) {
  const [open, setOpen] = useState(false);

  function reviewed() {
    setOpen(false);
    onReviewed();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <ActionIcon label="Tinjau laporan" icon="review" render={<Dialog.Trigger />} />
      <Dialog.Portal>
        <Dialog.Backdrop className="dashboard-backdrop" />
        <Dialog.Viewport className="dashboard-dialog-viewport">
          <Dialog.Popup className="dashboard-theme dashboard-dialog dashboard-ppl-review-dialog">
            <header className="dashboard-report-detail-heading">
              <div>
                <Dialog.Title className="dashboard-report-detail-title">Tinjau laporan</Dialog.Title>
                <Dialog.Description className="dashboard-report-detail-description">
                  Periksa foto, lokasi, dan catatan sebelum menyimpan keputusan.
                </Dialog.Description>
              </div>
              <Dialog.Close className="dashboard-icon-control" aria-label="Tutup tinjauan laporan">
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </header>
            <div className="dashboard-ppl-review-content">
              <ReviewPanel
                key={`${report.id}-${report.reviewRevision}-${report.status}`}
                report={report}
                correcting={false}
                correctionHref={correctionHref}
                detailHref={detailHref}
                onReviewed={reviewed}
              />
              {report.status !== "pending" && (
                <StaffHistory<ReviewEntry>
                  className="dashboard-review-history"
                  title="Riwayat verifikasi"
                  path={`reports/${report.id}/reviews`}
                  revision={report.reviewRevision}
                  schema={reviewEntrySchema}
                  entryKey={(entry) => entry.reviewRevision}
                  columns={["Temuan", "Waktu", "Petugas", "Status", "Catatan", "Alasan koreksi"]}
                  renderEntry={(entry) => (
                    <>
                      <td>
                        <div className="dashboard-enum-cell">
                          <span>{findings[entry.finding]}</span>
                          {entry.severity && <SeverityBadge severity={entry.severity} />}
                        </div>
                      </td>
                      <td>{formatDate(entry.recordedAt)} WIB</td>
                      <td>{entry.reviewer || "—"}</td>
                      <td>
                        <span className={tw(`tag tag-${entry.status}`)}>{statuses[entry.status]}</span>
                      </td>
                      <td>{entry.reviewNote || "—"}</td>
                      <td>{entry.reason || "—"}</td>
                    </>
                  )}
                />
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
