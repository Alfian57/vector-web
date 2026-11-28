"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { findings, formatDate, statuses, type Report, type ReviewEntry } from "@/lib/domain";
import { officerReportCorrectPath, officerReportPath, officerReportsPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { OfficerMap } from "../dashboard";
import { useRefreshOfficerPage } from "../use-ppl-dashboard";
import { reviewEntrySchema } from "@/lib/api-contracts";
import { StaffHistory } from "../staff-history";
import { ReviewPanel } from "../review-panel";
import { SeverityBadge } from "../../_components/severity-badge";
import { reportQueueFilters, reportQueueQuery, withReportQuery } from "./filters";
import { useEffect, useRef } from "react";
import { patchBrowserQuery } from "@/lib/query-state";
import { showToast } from "@/app/_components/toast";

export function OfficerReportDetail({ report, correcting }: { report: Report; correcting: boolean }) {
  const router = useRouter();
  useRefreshOfficerPage(!correcting);
  const search = useSearchParams();
  const notice = search.get("notice");
  const lastAnnouncedNotice = useRef<string | null>(null);
  const query = new URLSearchParams(search.toString());
  const queueQuery = reportQueueQuery(reportQueueFilters(search));
  for (const key of ["status", "finding", "page"]) query.delete(key);
  queueQuery.forEach((value, key) => query.set(key, value));
  const back = withReportQuery(officerReportsPath, query);
  const detail = withReportQuery(officerReportPath(report.id), query);

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

  function reviewed() {
    query.delete("notice");
    showToast("Keputusan verifikasi tersimpan.");
    router.replace(withReportQuery(correcting ? officerReportPath(report.id) : officerReportsPath, query));
  }

  return (
    <>
      <Link href={correcting ? detail : back} className={tw("text-link")}>
        {correcting ? "Kembali ke detail laporan" : "Kembali ke antrean laporan"}
      </Link>
      <h1>{correcting ? "Koreksi keputusan" : "Tinjau laporan"}</h1>
      <div className="dashboard-review-grid">
        <section className={tw("panel")}>
          <ReviewPanel
            key={`${report.id}-${report.reviewRevision}-${correcting}`}
            report={report}
            correcting={correcting}
            correctionHref={withReportQuery(officerReportCorrectPath(report.id), query)}
            detailHref={detail}
            onReviewed={reviewed}
          />
        </section>
        <OfficerMap selected={report} />
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
    </>
  );
}
