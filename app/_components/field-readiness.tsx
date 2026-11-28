import { ArrowRight, Download, ListTodo, Map } from "lucide-react";
import { radarReportsPath } from "@/lib/routes";
import { DashboardSkeleton } from "./dashboard-state";
import type { useRadar } from "./use-radar";

const number = new Intl.NumberFormat("id-ID");

export function FieldReadiness({
  data,
  online,
  queueReady,
  queueIssue,
  queued,
  needsReview,
}: {
  data: Pick<
    ReturnType<typeof useRadar>,
    "tiles" | "offlineMap" | "packageLoading" | "mapBusy" | "mapMessage" | "mapResult" | "saveMap"
  >;
  online: boolean;
  queueReady: boolean;
  queueIssue: boolean;
  queued: number;
  needsReview: number;
}) {
  const { tiles, offlineMap, packageLoading, mapBusy, mapMessage, mapResult, saveMap } = data;
  const latest = Boolean(offlineMap && (!tiles || offlineMap.version === tiles.version));
  const packagePending = packageLoading && !tiles && !offlineMap;
  const mapValue = latest ? "Siap" : tiles ? `${number.format(Math.ceil(tiles.bytes / 1_048_576))} MB` : undefined;
  const mapStatus = getMapStatus();

  function getMapStatus() {
    if (latest) return "Tersimpan di perangkat";
    if (mapBusy) return "Mengunduh peta…";
    if (!online) return "Sambungkan ke internet";
    if (!tiles) return "Paket peta belum tersedia";
    return offlineMap ? "Pembaruan tersedia" : "Ukuran unduhan";
  }

  return (
    <section className="dashboard-radar-widget dashboard-field-readiness" aria-labelledby="field-readiness-title">
      <h2 id="field-readiness-title">Kesiapan perangkat</h2>
      <div className="dashboard-readiness-items">
        <div className="dashboard-readiness-item">
          <h3>
            <Map size={16} aria-hidden="true" /> Peta offline
          </h3>
          {packagePending ? (
            <DashboardSkeleton kind="readiness" rows={1} label="Memeriksa peta offline…" />
          ) : (
            <div className="dashboard-readiness-status" role="status">
              <strong className="dashboard-readiness-value" aria-hidden={!mapValue}>
                {mapValue ?? "–"}
              </strong>
              <p>{mapStatus}</p>
            </div>
          )}
          {!latest && tiles && (
            <button
              type="button"
              className="dashboard-readiness-action dashboard-readiness-download"
              aria-label={offlineMap ? "Perbarui peta offline" : "Siapkan offline"}
              disabled={!online || mapBusy}
              onClick={() => void saveMap()}
            >
              <Download size={14} aria-hidden="true" />
              {offlineMap ? "Perbarui" : "Siapkan offline"}
            </button>
          )}
        </div>
        <div className="dashboard-readiness-item">
          <h3>
            <ListTodo size={16} aria-hidden="true" /> Antrean laporan
          </h3>
          {!queueIssue && !queueReady ? (
            <DashboardSkeleton kind="readiness" rows={1} label="Memuat antrean perangkat…" />
          ) : (
            <div className="dashboard-readiness-status" role="status">
              <strong className="dashboard-readiness-value" aria-hidden={queueIssue}>
                {queueIssue ? "–" : number.format(queued)}
              </strong>
              <p>{queueIssue ? "Antrean belum dapat dibuka" : queued ? "Laporan tersimpan" : "Antrean kosong"}</p>
              {!queueIssue && needsReview > 0 && (
                <p className="dashboard-readiness-attention">{number.format(needsReview)} perlu diperbaiki</p>
              )}
            </div>
          )}
          <a
            className="dashboard-readiness-action"
            href={`${radarReportsPath}#antrean-perangkat`}
            aria-label="Lihat antrean laporan"
          >
            Lihat antrean <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
      {mapResult === "error" && mapMessage && (
        <p className="dashboard-readiness-feedback" role="alert">
          {mapMessage}
        </p>
      )}
    </section>
  );
}
