"use client";

import { ArrowUpRight, Download, Layers3, MapPin, Radar, ScanLine } from "lucide-react";
import { useMemo, useState } from "react";
import { findings, formatDate, type Finding } from "@/lib/domain";
import { Map } from "./map";
import { FieldLabel } from "./field-label";
import { FieldGuide, ObservationTrend, WeatherPanel } from "./radar-insights";
import type { useRadar } from "./use-radar";
import { tw } from "@/lib/tw";

type RadarData = ReturnType<typeof useRadar>;
const noFindings: NonNullable<RadarData["radar"]>["summaries"] = [];

export function RadarView({ data, onReport }: { data: RadarData; onReport: () => void }) {
  const [finding, setFinding] = useState<Finding | "">("");
  const summaries = data.radar?.summaries ?? noFindings;
  const visible = useMemo(
    () => (finding ? summaries.filter((row) => row.finding === finding) : summaries),
    [finding, summaries],
  );
  const total = summaries.reduce((count, row) => count + row.count, 0);
  const clustered = new Set(summaries.filter((row) => row.clustered).map((row) => row.id)).size;
  const affected = new Set(summaries.map((row) => row.id)).size;
  const metrics = [
    { icon: Radar, label: "Temuan terverifikasi", value: total },
    { icon: Layers3, label: "Kecamatan dengan klaster", value: clustered },
    { icon: MapPin, label: "Kecamatan terpantau", value: affected },
  ];

  return (
    <>
      <section className={tw("radar-hero")}>
        <div>
          <p className={tw("location-label")}>
            <MapPin size={15} /> Kabupaten Karawang, Jawa Barat
          </p>
          <h1>Radar hama tanaman</h1>
          <p>Pantau temuan padi terverifikasi dan catat kondisi tanaman langsung dari lahan.</p>
        </div>
        <button className={tw("hero-action")} onClick={onReport}>
          <ScanLine size={20} /> Buat laporan <ArrowUpRight size={17} />
        </button>
      </section>
      <div className={tw("metrics")} aria-label="Ringkasan tujuh hari terakhir">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div className={tw("metric")} key={label}>
            <span className={tw("metric-icon")}>
              <Icon size={21} />
            </span>
            <div>
              <strong>{data.radar ? value : "–"}</strong>
              <p>{label}</p>
            </div>
          </div>
        ))}
      </div>
      <section className={tw("radar-grid")}>
        <div className={tw("panel radar-panel")}>
          <div className={tw("panel-heading")}>
            <div>
              <h2>Peta pemantauan</h2>
              <p>Temuan terverifikasi dalam tujuh hari terakhir</p>
            </div>
            <label className={tw("filter-label")}>
              <FieldLabel>Filter temuan radar</FieldLabel>
              <select value={finding} onChange={(event) => setFinding(event.target.value as Finding | "")}>
                <option value="">Semua temuan</option>
                {Object.entries(findings)
                  .filter(([key]) => key !== "unknown" && key !== "healthy")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <Map
            summaries={data.radar ? visible : undefined}
            tileUrl={data.tiles?.url}
            mapTilerKey={data.tiles?.mapTilerKey}
            offlineMap={data.offlineMap}
          />
          <div className={tw("map-footer")}>
            <div className={tw("legend")}>
              <span>
                <i className={tw("legend-cluster")} /> Klaster aktif
              </span>
              <span>
                <i className={tw("legend-observed")} /> Temuan sporadis
              </span>
              <span>
                <i className={tw("legend-empty")} /> Tanpa temuan
              </span>
            </div>
          </div>
        </div>
        <div className={tw("radar-aside")}>
          <WeatherPanel weather={data.weather} issue={data.weatherIssue} loading={data.loading} />
          <section className={tw("panel weather-panel")}>
            <div className={tw("section-title")}>
              <Download size={21} />
              <h2>Peta offline</h2>
            </div>
            <p className={tw("muted")}>
              {data.offlineMap
                ? "Peta Karawang sudah tersimpan di perangkat ini."
                : data.tiles
                  ? `Unduh peta Karawang (${Math.ceil(data.tiles.bytes / 1_048_576)} MB) sebelum ke lahan.`
                  : "Peta Karawang menunggu koneksi atau paket wilayah."}
            </p>
            {!!data.tiles && (
              <button
                className={tw("secondary")}
                onClick={() => void data.saveMap()}
                disabled={data.mapBusy || data.offlineMap?.version === data.tiles.version}
              >
                <Download size={16} />{" "}
                {data.mapBusy
                  ? "Mengunduh…"
                  : data.offlineMap?.version === data.tiles.version
                    ? "Siap offline"
                    : "Siapkan offline"}
              </button>
            )}
            {data.mapMessage && (
              <p className={tw("small")} role="status">
                {data.mapMessage}
              </p>
            )}
          </section>
        </div>
      </section>
      <section className={tw("panel observed-panel")}>
        <div className={tw("panel-heading")}>
          <div>
            <h2>Temuan per kecamatan</h2>
            {data.radar && (
              <p>
                {data.radarIssue ? "Cuplikan tersimpan" : "Diperbarui"} {formatDate(data.radar.updatedAt)} WIB
              </p>
            )}
          </div>
        </div>
        {visible.length ? (
          <ul className={tw("list")}>
            {visible.map((row) => (
              <li key={`${row.id}-${row.finding}`}>
                <div>
                  <strong>{row.name}</strong>
                  <p>{findings[row.finding]}</p>
                </div>
                <span className={tw(`tag ${row.clustered ? "tag-alert" : "tag-pending"}`)}>
                  {row.clustered ? "Klaster aktif" : "Sporadis"} · {row.count} laporan
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={tw("empty")}>
            {data.loading
              ? "Memuat laporan…"
              : data.radarIssue && !data.radar
                ? "Radar gagal diperbarui. Coba lagi saat layanan tersedia."
                : "Belum ada temuan terverifikasi untuk pilihan ini."}
          </p>
        )}
      </section>
      <ObservationTrend weeks={data.radar?.trend} cached={data.radarIssue} loading={data.loading} />
      <FieldGuide onReport={onReport} />
    </>
  );
}
