"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { dashboardPageSize } from "@/lib/pagination";
import type { DistrictSummary, Finding, RadarSnapshot } from "@/lib/domain";
import { DataTable } from "./data-table";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { Pagination } from "./pagination";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

const number = new Intl.NumberFormat("id-ID");
const compactNumber = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

export function RadarOverview({
  snapshot,
  loading,
  issue,
  onRetry,
}: {
  snapshot?: RadarSnapshot;
  loading: boolean;
  issue: boolean;
  onRetry: () => void;
}) {
  const districts = new Set(snapshot?.summaries.map((row) => row.id));
  const clusters = new Set(snapshot?.summaries.filter((row) => row.clustered).map((row) => row.id));
  const total = snapshot?.summaries.reduce((count, row) => count + row.count, 0) ?? 0;

  return (
    <section className="dashboard-radar-overview" aria-labelledby="radar-overview-title">
      <div className="dashboard-radar-overview-top">
        <p className="dashboard-radar-place">
          <MapPin size={16} aria-hidden="true" /> Kabupaten Karawang, Jawa Barat
        </p>
        <h2 id="radar-overview-title">Ringkasan pemantauan</h2>
      </div>
      {snapshot ? (
        <>
          <div className="dashboard-radar-verified">
            <strong title={number.format(total)} data-compact={total >= 1000 || undefined}>
              <span aria-hidden="true">{total >= 1000 ? compactNumber.format(total) : number.format(total)}</span>
              <span className="sr-only">{number.format(total)}</span>
            </strong>
            <span>Temuan terverifikasi</span>
            <small>7 hari terakhir</small>
          </div>
          <dl className="dashboard-radar-overview-stats">
            <div>
              <dt>Kecamatan terpantau</dt>
              <dd>{number.format(districts.size)}</dd>
            </div>
            <div>
              <dt>Kecamatan berklaster</dt>
              <dd>{number.format(clusters.size)}</dd>
            </div>
          </dl>
        </>
      ) : loading ? (
        <DashboardSkeleton label="Memuat ringkasan wilayah…" kind="metric" />
      ) : (
        <DashboardState
          compact
          kind={issue ? "error" : "empty"}
          title={issue ? "Ringkasan belum dapat dimuat" : "Ringkasan belum tersedia"}
          action={
            issue && (
              <button className="dashboard-inline-link" type="button" onClick={onRetry}>
                Coba lagi
              </button>
            )
          }
        />
      )}
      {/* The illustration is a decorative, service-worker-cached public asset. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="dashboard-radar-illustration" src="/radar-sawah.webp" width={640} height={453} alt="" />
    </section>
  );
}

export function RadarClusters({
  visible,
  available,
  loading,
  finding,
  focusedDistrict,
  onFocusDistrict,
}: {
  visible: readonly DistrictSummary[];
  available: boolean;
  loading: boolean;
  finding: Finding | "";
  focusedDistrict?: string;
  onFocusDistrict: (id: string) => void;
}) {
  const search = useSearchParams();
  const rawPage = search.get("clustersPage");
  const page = parsePageIndex(rawPage);
  const districtClusters = new Map<string, { name: string; count: number }>();
  for (const row of visible) {
    if (!row.clustered) continue;
    const previous = districtClusters.get(row.id)?.count ?? 0;
    districtClusters.set(row.id, { name: row.name, count: previous + row.count });
  }
  const clusters = [...districtClusters].sort(
    ([, a], [, b]) => b.count - a.count || a.name.localeCompare(b.name, "id"),
  );
  const totalPages = Math.ceil(clusters.length / dashboardPageSize);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;

  useEffect(() => {
    normalizeBrowserPage("clustersPage", rawPage, available ? currentPage : page);
  }, [available, currentPage, page, rawPage]);

  return (
    <section className="dashboard-panel dashboard-radar-clusters" aria-labelledby="radar-clusters-title">
      <header className="dashboard-radar-detail-heading">
        <h2 id="radar-clusters-title">Klaster aktif</h2>
        {available && (
          <p>
            {number.format(districtClusters.size)} kecamatan{finding ? " untuk filter ini" : ""}
          </p>
        )}
      </header>
      {!available && loading ? (
        <DashboardSkeleton label="Memuat klaster aktif…" kind="table" columns={2} rows={2} />
      ) : clusters.length ? (
        <>
          <DataTable label="Kecamatan dengan klaster aktif" columns={["Kecamatan", { label: "Laporan", numeric: true }]}>
            {clusters
              .slice(currentPage * dashboardPageSize, (currentPage + 1) * dashboardPageSize)
              .map(([id, district]) => (
                <tr key={id}>
                  <th scope="row">
                    <button
                      type="button"
                      className="dashboard-district-focus"
                      aria-controls="radar-map"
                      aria-pressed={focusedDistrict === id}
                      onClick={() => onFocusDistrict(id)}
                    >
                      {district.name}
                    </button>
                  </th>
                  <td className="dashboard-table-number">{number.format(district.count)} laporan</td>
                </tr>
              ))}
          </DataTable>
          <Pagination
            label="Halaman klaster aktif"
            page={currentPage}
            hasNext={currentPage < totalPages - 1}
            totalPages={totalPages}
            onPage={(nextPage) => patchBrowserQuery({ clustersPage: pageQueryValue(nextPage) })}
          />
        </>
      ) : (
        <DashboardState
          compact
          kind={available && finding ? "filtered" : "empty"}
          title={
            !available
              ? "Data klaster belum tersedia"
              : finding
                ? "Tidak ada klaster untuk filter ini"
                : "Belum ada klaster aktif"
          }
          description={
            available && !finding ? "Klaster terverifikasi dalam 7 hari terakhir akan muncul di sini." : undefined
          }
        />
      )}
    </section>
  );
}
