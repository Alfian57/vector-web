"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatDate, type Report } from "@/lib/domain";
import { reportPageResponseSchema } from "@/lib/api-contracts";
import { officerReportPath, officerReportsPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { DashboardSkeleton, DashboardState } from "../_components/dashboard-state";
import { DataTable } from "../_components/data-table";
import { RadarLegend } from "../_components/radar-legend";
import { Map } from "../_components/map";
import { useRadar } from "../_components/use-radar";
import { useOfficerRevision } from "./officer-shell";
import { useOfficerData } from "./use-ppl-dashboard";

export function OfficerRadar() {
  return (
    <>
      <header className={tw("page-heading")}>
        <div>
          <h1>Dasbor PPL</h1>
          <p>Verifikasi temuan dan tindak lanjut pemantauan padi di Karawang.</p>
        </div>
      </header>
      <div className="dashboard-field-workspace">
        <OfficerMap workspace />
        <OfficerVerificationPanel />
      </div>
    </>
  );
}

function OfficerVerificationPanel() {
  const { data, issue, loading, retry } = useOfficerData(
    "reports?scope=ppl&status=pending&page=0",
    reportPageResponseSchema,
  );
  const reports = data?.reports.slice(0, 3);

  return (
    <section
      className="dashboard-field-overview dashboard-officer-overview"
      aria-labelledby="officer-verification-title"
    >
      <div className="dashboard-officer-queue">
        <h2 id="officer-verification-title">Antrean verifikasi</h2>
        <p>Tinjau foto dan lokasi laporan sebelum hasilnya muncul di radar.</p>
        <Link className={tw("secondary")} href={officerReportsPath}>
          Buka antrean laporan
        </Link>
      </div>
      <div className="dashboard-field-clusters">
        {issue && (
          <DashboardState
            compact
            kind="error"
            title="Antrean belum dapat dimuat"
            action={
              <button type="button" className="dashboard-inline-link" onClick={retry}>
                Coba lagi
              </button>
            }
          />
        )}
        {reports?.length ? (
          <DataTable label="Laporan menunggu verifikasi" columns={["Kecamatan", "Pengamatan"]} busy={loading}>
            {reports.map((report) => (
              <tr key={report.id}>
                <th scope="row">
                  <Link className="dashboard-district-focus" href={officerReportPath(report.id)}>
                    {report.districtName}
                  </Link>
                </th>
                <td>{formatDate(report.observedAt)} WIB</td>
              </tr>
            ))}
          </DataTable>
        ) : loading ? (
          <DashboardSkeleton kind="table" columns={2} rows={3} label="Memuat antrean laporan…" />
        ) : !issue ? (
          <DashboardState compact title="Antrean verifikasi kosong" />
        ) : null}
      </div>
    </section>
  );
}

export function OfficerMap({
  selected,
  finding,
  workspace = false,
}: {
  selected?: Report;
  finding?: string;
  workspace?: boolean;
}) {
  const revision = useOfficerRevision();
  const radar = useRadar();
  const { refresh } = radar;
  useEffect(() => {
    if (revision) void refresh();
  }, [revision, refresh]);
  const summaries = radar.radar?.summaries;

  return (
    <section className={tw(`panel dashboard-map-panel ${workspace ? "dashboard-field-map" : ""}`)}>
      <div className="dashboard-map-heading">
        <div>
          <h2>Peta radar</h2>
          <p>
            {selected ? `Lokasi laporan di ${selected.districtName}` : "Agregat temuan terverifikasi per kecamatan"}
          </p>
        </div>
      </div>
      <Map
        summaries={finding ? summaries?.filter((row) => row.finding === finding) : summaries}
        tileUrl={radar.tiles?.url}
        mapTilerKey={radar.tiles?.mapTilerKey}
        offlineMap={radar.offlineMap}
        selected={selected}
        fitDistricts={workspace}
      />
      <RadarLegend />
    </section>
  );
}
