"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ClipboardCheck, NotebookPen, Sprout, X } from "lucide-react";
import type { ReactNode } from "react";
import { DashboardState } from "./dashboard-state";
import { DataTable } from "./data-table";
import { findings, formatDate, statuses, type Report } from "@/lib/domain";
import { tw } from "@/lib/tw";
import { ActionIcon } from "./action-icon";
import { SeverityBadge } from "./severity-badge";

function followUpAdvice(report: Report) {
  if (report.status === "pending") return "Simpan catatan pengamatan terbaru sambil menunggu hasil pemeriksaan PPL.";
  if (report.status === "rejected")
    return "Baca catatan PPL. Jika gejala masih terlihat, kirim laporan baru dengan foto dan lokasi yang lebih jelas.";
  if (report.finding === "healthy") return "Lanjutkan pemeriksaan berkala dan catat jika kondisi tanaman berubah.";
  if (report.severity === "severe")
    return "Hubungi PPL dengan membawa hasil verifikasi ini untuk meminta pemeriksaan lanjutan di petak Anda.";
  return "Periksa kembali petak dan gunakan catatan PPL untuk menentukan tindak lanjut. Catat perubahan gejala bila ada.";
}

export function ReportList({
  reports,
  reviewDialog,
  busy = false,
}: {
  reports: Report[];
  reviewDialog?: (report: Report) => ReactNode;
  busy?: boolean;
}) {
  if (!reports.length) return <DashboardState title="Belum ada laporan." />;
  const columns = ["Temuan", "Kecamatan", "Waktu pengamatan", "Keparahan", "Status"];
  if (reviewDialog) columns.push("Catatan PPL");
  columns.push("Aksi");

  return (
    <DataTable
      label={reviewDialog ? "Antrean laporan" : "Laporan terkirim"}
      columns={columns}
      busy={busy}
    >
      {reports.map((report) => (
        <tr key={report.id}>
          <td>
            <strong>{findings[report.finding]}</strong>
          </td>
          <td>{report.districtName}</td>
          <td>{formatDate(report.observedAt)} WIB</td>
          <td>{report.severity ? <SeverityBadge severity={report.severity} /> : "—"}</td>
          <td>
            <span className={tw(`tag tag-${report.status}`)}>{statuses[report.status]}</span>
          </td>
          {reviewDialog && <td>{report.reviewNote || "—"}</td>}
          <td>
            {reviewDialog ? (
              reviewDialog(report)
            ) : (
              <div className="dashboard-action-group">
                <Dialog.Root>
                  <ActionIcon
                    label="Lihat detail"
                    icon="file"
                    render={<Dialog.Trigger />}
                  />
                  <Dialog.Portal>
                    <Dialog.Backdrop className="dashboard-backdrop" />
                    <Dialog.Viewport className="dashboard-dialog-viewport">
                      <Dialog.Popup className="dashboard-theme dashboard-dialog dashboard-report-detail">
                        <header className="dashboard-report-detail-heading">
                          <div>
                            <Dialog.Title className="dashboard-report-detail-title">Detail laporan</Dialog.Title>
                            <Dialog.Description className="dashboard-report-detail-description">
                              {findings[report.finding]} · {report.districtName} · {formatDate(report.observedAt)} WIB
                            </Dialog.Description>
                          </div>
                          <Dialog.Close className="dashboard-icon-control" aria-label="Tutup detail laporan">
                            <X size={18} aria-hidden="true" />
                          </Dialog.Close>
                        </header>
                        <div className="dashboard-report-detail-body">
                          <div className="dashboard-report-detail-meta">
                            <span className={tw(`tag tag-${report.status}`)}>{statuses[report.status]}</span>
                            {report.severity ? (
                              <SeverityBadge severity={report.severity} />
                            ) : (
                              <span>Keparahan belum ditentukan</span>
                            )}
                          </div>
                          <dl className="dashboard-report-detail-list">
                            <div className="dashboard-report-detail-observation">
                              <dt>
                                <NotebookPen size={15} strokeWidth={1.9} aria-hidden="true" />
                                Catatan pengamatan
                              </dt>
                              <dd>{report.notes || "Tidak ada catatan dari petani."}</dd>
                            </div>
                            <div className="dashboard-report-detail-officer-note">
                              <dt>
                                <ClipboardCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                                Catatan PPL
                              </dt>
                              <dd>{report.reviewNote || "Belum ada catatan dari PPL."}</dd>
                            </div>
                            <div className="dashboard-report-detail-advice">
                              <dt>
                                <Sprout size={16} strokeWidth={1.9} aria-hidden="true" />
                                Saran tindak lanjut
                              </dt>
                              <dd>{followUpAdvice(report)}</dd>
                            </div>
                          </dl>
                        </div>
                      </Dialog.Popup>
                    </Dialog.Viewport>
                  </Dialog.Portal>
                </Dialog.Root>
                <ActionIcon
                  href={`/api/reports/${report.id}/photo`}
                  target="_blank"
                  rel="noreferrer"
                  label="Lihat foto"
                  icon="photo"
                />
              </div>
            )}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
