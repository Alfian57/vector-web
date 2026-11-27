"use client";

import Link from "next/link";
import { educationPath, officerPath, radarPath, whatsappLinkPath } from "@/lib/routes";
import { ArrowLeft, BookOpen, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { findings, statuses, type Account } from "@/lib/domain";
import { Brand } from "../_components/brand";
import { AccountMenu } from "../_components/account-menu";
import { FieldLabel } from "../_components/field-label";
import { Map } from "../_components/map";
import { ReportList } from "../_components/report-list";
import { useRadar } from "../_components/use-radar";
import { ActionsPanel } from "./actions-panel";
import { AidPanel } from "./aid-panel";
import { ReviewPanel } from "./review-panel";
import { usePplDashboard } from "./use-ppl-dashboard";
import { DashboardGlobalSearch } from "../_components/dashboard-global-search";
import { tw } from "@/lib/tw";
import { pplSearchItems } from "./search-items";

export function Dashboard({ account }: { account: Account }) {
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState("pending");
  const [finding, setFinding] = useState("");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const radar = useRadar();
  const { reports, hasMore, live, error, followUps, districts, districtError, revision, load, clearReports } =
    usePplDashboard({
      filter,
      finding,
      page,
      refreshRadar: radar.refresh,
    });
  const summaries = radar.radar?.summaries;
  const visible = useMemo(
    () => (finding ? summaries?.filter((row) => finding === row.finding) : summaries),
    [finding, summaries],
  );

  const report = reports?.find((row) => row.id === selected);
  const searchItems = pplSearchItems(Boolean(report));

  function reviewed() {
    setMessage("Keputusan verifikasi tersimpan.");
    setSelected(undefined);
    void load();
    void radar.refresh();
  }

  function changeFilter(set: (input: string) => void, input: string) {
    set(input);
    setPage(0);
    clearReports();
    setSelected(undefined);
  }

  return (
    <div className={tw("officer-layout")}>
      <header className={tw("officer-top")}>
        <Brand />
        <div className={tw("topbar-actions")}>
          <DashboardGlobalSearch items={searchItems} />
          <AccountMenu account={account} />
          {!account.whatsappLinked && (
            <Link
              className={tw("text-link small")}
              href={`${whatsappLinkPath}&next=${encodeURIComponent(officerPath)}`}
            >
              Hubungkan WhatsApp
            </Link>
          )}
          <Link className={tw("secondary")} href={educationPath}>
            <BookOpen size={16} /> Edukasi
          </Link>
          <Link className={tw("secondary")} href={radarPath}>
            <ArrowLeft size={16} /> Radar
          </Link>
        </div>
      </header>
      <main className={tw("content")}>
        <div className={tw("page-heading")}>
          <div>
            <h1>Dasbor PPL</h1>
            <p>Verifikasi temuan dan tindak lanjut pemantauan padi di Karawang.</p>
          </div>
          <span className={tw(`connection ${live ? "" : "connection-offline"}`)} role="status">
            <Radio size={15} /> {live ? "Terhubung langsung" : "Menyambungkan…"}
          </span>
        </div>
        {message && (
          <p className={tw("message")} role="status">
            {message}
          </p>
        )}
        {error && (
          <p className={tw("message error-text")} role="alert">
            {error}
          </p>
        )}
        <div className={tw("radar-grid officer-grid")}>
          <section id="ppl-map" className={tw("panel radar-panel")}>
            <div className={tw("panel-heading")}>
              <div>
                <h2>Peta radar</h2>
                <p>
                  {report
                    ? `Lokasi laporan yang dipilih di ${report.districtName}`
                    : "Agregat temuan terverifikasi per kecamatan"}
                </p>
              </div>
            </div>
            <Map
              summaries={visible}
              tileUrl={radar.tiles?.url}
              mapTilerKey={radar.tiles?.mapTilerKey}
              offlineMap={radar.offlineMap}
              selected={report}
            />
            <div className={tw("map-footer legend")}>
              <span>
                <i className={tw("legend-cluster")} /> Klaster aktif
              </span>
              <span>
                <i className={tw("legend-observed")} /> Sporadis
              </span>
            </div>
          </section>
          <section id="ppl-queue" className={tw("panel queue-panel")}>
            <div className={tw("panel-heading")}>
              <div>
                <h2>Antrean laporan</h2>
                <p>Pilih laporan untuk memeriksa foto dan lokasi.</p>
              </div>
            </div>
            <div className={tw("panel-note form-two")}>
              <label>
                <FieldLabel>Status laporan</FieldLabel>
                <select value={filter} onChange={(event) => changeFilter(setFilter, event.target.value)}>
                  <option value="">Semua status</option>
                  {Object.entries(statuses).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>Jenis temuan</FieldLabel>
                <select value={finding} onChange={(event) => changeFilter(setFinding, event.target.value)}>
                  <option value="">Semua temuan</option>
                  {Object.entries(findings).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {reports ? (
              <ReportList
                reports={reports}
                active={selected}
                onSelect={(item) => {
                  setSelected(item.id);
                  setMessage("");
                }}
              />
            ) : (
              <p className={tw("empty")}>{error ? "Antrean belum tersedia." : "Memuat laporan…"}</p>
            )}
            {(page > 0 || hasMore) && (
              <div className={tw("panel-note button-row action-row")}>
                <button className={tw("secondary")} disabled={!page} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </button>
                <button className={tw("secondary")} disabled={!hasMore} onClick={() => setPage(page + 1)}>
                  Berikutnya
                </button>
              </div>
            )}
          </section>
        </div>
        {report && (
          <section id="ppl-review" className={tw("panel")}>
            <ReviewPanel key={report.id} report={report} onReviewed={reviewed} />
          </section>
        )}
        {districtError && (
          <p className={tw("message error-text")} role="alert">
            Daftar kecamatan belum tersedia.
          </p>
        )}
        <ActionsPanel
          id="ppl-actions"
          districts={districts}
          followUps={followUps}
          revision={revision}
          onChange={() => void load()}
        />
        <AidPanel id="ppl-aid" districts={districts} revision={revision} />
      </main>
    </div>
  );
}
