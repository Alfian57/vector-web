"use client";

import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { findings, findLabel, formatDate, type Finding } from "@/lib/domain";
import { dashboardPageSize } from "@/lib/pagination";
import { tw } from "@/lib/tw";
import { DataTable } from "./data-table";
import { Pagination } from "./pagination";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { FieldLabel } from "./field-label";
import { Map } from "./map";
import { RadarLegend } from "./radar-legend";
import { RadarClusters, RadarOverview } from "./radar-overview";
import { FieldReadiness } from "./field-readiness";
import { ObservationTrend } from "./observation-trend";
import { WeatherPanel } from "./weather-panel";
import type { useRadar } from "./use-radar";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

type RadarData = ReturnType<typeof useRadar>;
const noFindings: NonNullable<RadarData["radar"]>["summaries"] = [];
const number = new Intl.NumberFormat("id-ID");

export function RadarView({
  data,
  readiness,
}: {
  data: RadarData;
  readiness: {
    online: boolean;
    queueReady: boolean;
    queueIssue: boolean;
    queued: number;
    needsReview: number;
  };
}) {
  const search = useSearchParams();
  const requestedFinding = search.get("finding") ?? "";
  const parsedFinding = findLabel.safeParse(requestedFinding);
  const finding: Finding | "" = parsedFinding.success ? parsedFinding.data : "";
  const [focusedDistrict, setFocusedDistrict] = useState<string>();
  const rawFindingsPage = search.get("findingsPage");
  const findingsPage = parsePageIndex(rawFindingsPage);
  const mapRegion = useRef<HTMLElement>(null);
  const summaries = data.radar?.summaries ?? noFindings;
  const visible = finding ? summaries.filter((row) => row.finding === finding) : summaries;
  const findingsTotalPages = Math.ceil(visible.length / dashboardPageSize);
  const currentFindingsPage = Math.min(findingsPage, Math.max(0, findingsTotalPages - 1));
  const activeDistrict = visible.some((row) => row.clustered && row.id === focusedDistrict)
    ? focusedDistrict
    : undefined;
  const time = data.radar
    ? `${data.radarIssue ? "Cuplikan tersimpan" : "Diperbarui"} ${formatDate(data.radar.updatedAt)} WIB`
    : undefined;

  function changeFinding(value: Finding | "") {
    setFocusedDistrict(undefined);
    patchBrowserQuery({ finding: value || null, clustersPage: null, findingsPage: null });
  }

  useEffect(() => {
    if (requestedFinding !== finding || (search.has("finding") && !finding)) {
      patchBrowserQuery({ finding: finding || null }, "replace");
    }
  }, [finding, requestedFinding, search]);

  useEffect(() => {
    normalizeBrowserPage("findingsPage", rawFindingsPage, data.radar ? currentFindingsPage : findingsPage);
  }, [currentFindingsPage, data.radar, findingsPage, rawFindingsPage]);

  function focusDistrict(id: string) {
    setFocusedDistrict(activeDistrict === id ? undefined : id);
    const region = mapRegion.current;
    if (region && region.getBoundingClientRect().top < 66) {
      region.focus({ preventScroll: true });
      region.scrollIntoView({ block: "start" });
    }
  }

  return (
    <>
      <h1 className="dashboard-radar-title">Radar hama tanaman</h1>
      <div className="dashboard-radar-main-grid">
        <RadarOverview snapshot={data.radar} loading={data.loading} issue={data.radarIssue} onRetry={data.refresh} />
        <section
          ref={mapRegion}
          id="radar-map"
          className={tw("panel dashboard-map-panel dashboard-field-map dashboard-radar-map dashboard-page-anchor")}
          aria-labelledby="radar-map-title"
          tabIndex={-1}
        >
          <div className="dashboard-radar-map-header">
            <div className="dashboard-radar-map-title">
              <h2 id="radar-map-title">Peta Karawang</h2>
              {time && <p role="status">{time}</p>}
            </div>
            <label className="dashboard-radar-filter">
              <span className="sr-only">
                <FieldLabel>Filter temuan radar</FieldLabel>
              </span>
              <select
                value={finding}
                onChange={(event) => {
                  const choice = findLabel.safeParse(event.currentTarget.value);
                  changeFinding(choice.success ? choice.data : "");
                }}
              >
                <option value="">Semua temuan</option>
                {Object.entries(findings)
                  .filter(([key]) => key !== "unknown" && key !== "healthy")
                  .map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            {activeDistrict && (
              <button
                type="button"
                className="dashboard-map-reset"
                aria-label="Tampilkan seluruh Karawang"
                title="Tampilkan seluruh Karawang"
                onClick={() => {
                  setFocusedDistrict(undefined);
                  mapRegion.current?.focus({ preventScroll: true });
                }}
              >
                <LocateFixed size={17} aria-hidden="true" />
              </button>
            )}
          </div>
          <Map
            summaries={data.radar ? visible : undefined}
            tileUrl={data.tiles?.url}
            mapTilerKey={data.tiles?.mapTilerKey}
            offlineMap={data.offlineMap}
            fitDistricts
            focusedDistrict={activeDistrict}
          />
          <div className="dashboard-radar-map-key">
            <RadarLegend />
          </div>
        </section>
      </div>
      <div className="dashboard-radar-support-grid">
        <WeatherPanel
          weather={data.weather}
          issue={data.weatherIssue}
          loading={data.weatherLoading}
          onRetry={data.refresh}
        />
        <ObservationTrend weeks={data.radar?.trend} loading={data.loading} cached={data.radarIssue} />
        <FieldReadiness data={data} {...readiness} />
      </div>
      <div className="dashboard-radar-detail-grid">
        <RadarClusters
          visible={visible}
          available={Boolean(data.radar)}
          loading={data.loading}
          finding={finding}
          focusedDistrict={activeDistrict}
          onFocusDistrict={focusDistrict}
        />
        <section
          className={tw("panel dashboard-radar-findings dashboard-page-anchor")}
          id="radar-findings"
          aria-labelledby="district-findings"
        >
          <div className="dashboard-radar-detail-heading">
            <h2 id="district-findings">Temuan per kecamatan</h2>
          </div>
          {visible.length ? (
            <>
              <DataTable
                label="Temuan per kecamatan"
                columns={["Kecamatan", "Temuan", "Status", { label: "Jumlah laporan", numeric: true }]}
              >
                {visible
                  .slice(currentFindingsPage * dashboardPageSize, (currentFindingsPage + 1) * dashboardPageSize)
                  .map((row) => (
                    <tr key={`${row.id}-${row.finding}`}>
                      <th scope="row">{row.name}</th>
                      <td>{findings[row.finding]}</td>
                      <td>
                        <span className={tw(`tag ${row.clustered ? "tag-alert" : "tag-pending"}`)}>
                          {row.clustered ? "Klaster aktif" : "Sporadis"}
                        </span>
                      </td>
                      <td className="dashboard-table-number">{number.format(row.count)} laporan</td>
                    </tr>
                  ))}
              </DataTable>
              <Pagination
                label="Halaman temuan per kecamatan"
                page={currentFindingsPage}
                hasNext={currentFindingsPage < findingsTotalPages - 1}
                totalPages={findingsTotalPages}
                onPage={(nextPage) => patchBrowserQuery({ findingsPage: pageQueryValue(nextPage) })}
              />
            </>
          ) : data.loading && !data.radar ? (
            <DashboardSkeleton label="Memuat laporan…" kind="table" columns={4} />
          ) : data.radarIssue && !data.radar ? (
            <DashboardState
              kind="error"
              title="Radar belum dapat diperbarui"
              description="Periksa koneksi untuk memuat temuan terbaru."
              action={
                <button className={tw("secondary")} onClick={() => void data.refresh()}>
                  Coba lagi
                </button>
              }
            />
          ) : finding ? (
            <DashboardState
              kind="filtered"
              title="Tidak ada temuan untuk filter ini"
              action={
                <button className={tw("secondary")} onClick={() => changeFinding("")}>
                  Hapus filter
                </button>
              }
            />
          ) : (
            <DashboardState
              title="Belum ada temuan terverifikasi"
              description="Temuan akan muncul setelah diverifikasi oleh PPL."
            />
          )}
        </section>
      </div>
    </>
  );
}
