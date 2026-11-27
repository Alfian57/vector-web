"use client";

import { Check, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { FieldLabel } from "../_components/field-label";
import { findings, formatDate, severities, statuses, type Report, type ReviewEntry } from "@/lib/domain";
import { reviewEntrySchema } from "@/lib/api-contracts";
import { StaffHistory } from "./history";
import { tw } from "@/lib/tw";

export function ReviewPanel({ report, onReviewed }: { report: Report; onReviewed: () => void }) {
  const [decision, setDecision] = useState<"verified" | "rejected" | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [correctionRevision, setCorrectionRevision] = useState<number>();
  const correcting = correctionRevision !== undefined;
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
          ...(correcting ? { revision: correctionRevision, reason: form.get("reason") } : {}),
        }),
      );
      onReviewed();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
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
      <div className={tw("review-image")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- This authenticated photo cannot use the image optimizer. */}
        <img src={`/api/reports/${report.id}/photo`} alt="Foto daun dari laporan petani" />
      </div>
      <div className={tw("review-summary")}>
        <strong>
          {findings[report.finding]}
          {report.severity && ` · ${severities[report.severity]}`}
        </strong>
        <p>
          <MapPin size={15} /> {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
        </p>
        {report.notes && <p>{report.notes}</p>}
        {report.reviewNote && <p>Catatan PPL · {report.reviewNote}</p>}
      </div>
      {report.status !== "pending" && (
        <>
          <StaffHistory<ReviewEntry>
            title="Riwayat verifikasi"
            path={historyPath}
            revision={report.reviewRevision}
            schema={reviewEntrySchema}
            entryKey={(entry) => entry.reviewRevision}
            renderEntry={(entry) => (
              <>
                <div>
                  <strong>
                    {findings[entry.finding]}
                    {entry.severity && ` · ${severities[entry.severity]}`}
                  </strong>
                  <p>
                    {entry.reviewer ? `${entry.reviewer} · ` : ""}
                    {formatDate(entry.recordedAt)} WIB
                  </p>
                  {entry.reviewNote && <p>{entry.reviewNote}</p>}
                  {entry.reason && <p>Alasan koreksi · {entry.reason}</p>}
                </div>
                <span className={tw(`tag tag-${entry.status}`)}>{statuses[entry.status]}</span>
              </>
            )}
          />
          {!correcting && (
            <div className={tw("panel-note button-row action-row")}>
              <button
                className={tw("secondary")}
                onClick={() => {
                  if (report.status !== "pending") setDecision(report.status);
                  setCorrectionRevision(report.reviewRevision);
                }}
              >
                Koreksi keputusan
              </button>
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
              <button
                type="button"
                className={tw("secondary")}
                disabled={busy}
                onClick={() => {
                  setCorrectionRevision(undefined);
                  setDecision("");
                  setError("");
                }}
              >
                Batal koreksi
              </button>
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
