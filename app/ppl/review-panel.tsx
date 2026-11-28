"use client";

import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { DashboardSkeleton, DashboardState } from "../_components/dashboard-state";
import { FieldLabel } from "../_components/field-label";
import { SeverityBadge } from "../_components/severity-badge";
import { findings, formatDate, severities, statuses, type Report } from "@/lib/domain";
import { tw } from "@/lib/tw";

export function ReviewPanel({
  report,
  correcting,
  correctionHref,
  detailHref,
  onReviewed,
}: {
  report: Report;
  correcting: boolean;
  correctionHref: string;
  detailHref: string;
  onReviewed: () => void;
}) {
  const [decision, setDecision] = useState<"verified" | "rejected" | "">(
    correcting && report.status !== "pending" ? report.status : "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<"loading" | "ready" | "failed">("loading");
  const historyPath = `reports/${report.id}/reviews`;

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !decision) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(
        correcting ? historyPath : `reports/${report.id}/review`,
        jsonRequest("PATCH", {
          status: decision,
          finding: form.get("finding"),
          severity: form.get("severity"),
          note: form.get("note"),
          ...(correcting ? { revision: report.reviewRevision, reason: form.get("reason") } : {}),
        }),
      );
      onReviewed();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <div className={tw("review-detail")}>
      <div className={tw("panel-heading")}>
        <div>
          <h2>Detail temuan</h2>
          <p>
            {report.districtName} · {formatDate(report.observedAt)} WIB
          </p>
        </div>
        <span className={tw(`tag tag-${report.status}`)}>{statuses[report.status]}</span>
      </div>
      <div className="dashboard-review-image">
        {photo === "loading" && <DashboardSkeleton kind="photo" label="Memuat foto laporan…" />}
        {photo === "failed" ? (
          <DashboardState compact kind="error" title="Foto laporan belum dapat ditampilkan" />
        ) : (
          // Private photos must be requested with the current session.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/reports/${report.id}/photo`}
            alt="Foto daun dari laporan petani"
            className={photo === "loading" ? "dashboard-review-image-pending" : undefined}
            onLoad={() => setPhoto("ready")}
            onError={() => setPhoto("failed")}
          />
        )}
      </div>
      <div className={tw("review-summary")}>
        <div className="dashboard-enum-cell">
          <strong>{findings[report.finding]}</strong>
          {report.severity && <SeverityBadge severity={report.severity} />}
        </div>
        <p>
          <MapPin size={15} /> {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
        </p>
        {report.notes && <p>{report.notes}</p>}
        {report.reviewNote && <p>Catatan PPL · {report.reviewNote}</p>}
      </div>
      {report.status !== "pending" && (
        <>
          {!correcting && (
            <div className={tw("panel-note button-row action-row")}>
              <Link className={tw("secondary")} href={correctionHref}>
                Koreksi keputusan
              </Link>
            </div>
          )}
        </>
      )}
      {(report.status === "pending" || correcting) && (
        <form className={tw("field-form embedded")} onSubmit={review}>
          <label>
            <FieldLabel required>Keputusan</FieldLabel>
            <select
              required
              value={decision}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDecision(value === "verified" || value === "rejected" ? value : "");
              }}
            >
              <option value="" disabled>
                Pilih keputusan
              </option>
              <option value="verified">Verifikasi</option>
              <option value="rejected">Tolak laporan</option>
            </select>
          </label>
          {decision === "verified" && (
            <div className={tw("form-two")}>
              <label>
                <FieldLabel required>Temuan terverifikasi</FieldLabel>
                <select name="finding" required defaultValue={report.finding === "unknown" ? "" : report.finding}>
                  <option value="" disabled>
                    Pilih temuan
                  </option>
                  {Object.entries(findings)
                    .filter(([key]) => key !== "unknown")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <FieldLabel required>Keparahan</FieldLabel>
                <select name="severity" required defaultValue={correcting ? (report.severity ?? "") : ""}>
                  <option value="" disabled>
                    Pilih keparahan
                  </option>
                  {Object.entries(severities).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {decision && (
            <label key={decision}>
              <FieldLabel required={decision === "rejected"}>
                {decision === "rejected" ? "Alasan penolakan" : "Catatan verifikasi"}
              </FieldLabel>
              <textarea
                name="note"
                rows={2}
                maxLength={600}
                required={decision === "rejected"}
                defaultValue={correcting && decision === report.status ? (report.reviewNote ?? "") : ""}
                placeholder={
                  decision === "rejected"
                    ? "Contoh: Foto daun kurang jelas."
                    : "Contoh: Disarankan pemeriksaan lanjutan."
                }
              />
            </label>
          )}
          {correcting && (
            <label>
              <FieldLabel required>Alasan koreksi keputusan</FieldLabel>
              <textarea
                name="reason"
                placeholder="Contoh: Foto dan lokasi diperiksa kembali."
                rows={2}
                maxLength={600}
                required
              />
            </label>
          )}
          {error && (
            <p className={tw("error-text")} role="alert">
              {error}
            </p>
          )}
          <div className={tw("button-row action-row")}>
            {correcting && (
              <Link className={tw("secondary")} href={detailHref}>
                Batal koreksi
              </Link>
            )}
            <button className={tw(decision === "rejected" ? "danger" : "primary")} disabled={busy || !decision}>
              <Check size={17} />{" "}
              {busy
                ? "Menyimpan…"
                : correcting
                  ? "Simpan koreksi keputusan"
                  : decision === "verified"
                    ? "Verifikasi laporan"
                    : "Tolak laporan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
