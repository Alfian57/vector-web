"use client";

import { ExternalLink } from "lucide-react";
import { findings, formatDate, severities, statuses, type Report } from "@/lib/domain";
import { tw } from "@/lib/tw";

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
  active,
  onSelect,
}: {
  reports: Report[];
  active?: string;
  onSelect?: (report: Report) => void;
}) {
  if (!reports.length) return <p className={tw("empty")}>Belum ada laporan.</p>;
  return (
    <ul className={tw("list reports-list")}>
      {reports.map((report) => (
        <li key={report.id} className={tw(active === report.id ? "selected" : "")}>
          <div>
            {onSelect ? (
              <button className={tw("report-link")} onClick={() => onSelect(report)}>
                {findings[report.finding]} · {report.districtName}
              </button>
            ) : (
              <strong>
                {findings[report.finding]} · {report.districtName}
              </strong>
            )}
            <p>
              {formatDate(report.observedAt)} WIB{report.severity ? ` · ${severities[report.severity]}` : ""}
            </p>
            {report.reviewNote && <p>{report.reviewNote}</p>}
            {!onSelect && (
              <>
                <a
                  className={tw("small text-link")}
                  href={`/api/reports/${report.id}/photo`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lihat foto <ExternalLink size={13} />
                </a>
                <details className={tw("report-advice")}>
                  <summary>Saran tindak lanjut</summary>
                  <p>{followUpAdvice(report)}</p>
                </details>
              </>
            )}
          </div>
          <span className={tw(`tag tag-${report.status}`)}>{statuses[report.status]}</span>
        </li>
      ))}
    </ul>
  );
}
