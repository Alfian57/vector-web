"use client";

import type { ObservedWeek } from "@/lib/domain";
import { tw } from "@/lib/tw";

const day = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const number = new Intl.NumberFormat("id-ID");

export function ObservationTrend({
  weeks,
  cached,
  loading,
}: {
  weeks?: ObservedWeek[];
  cached: boolean;
  loading: boolean;
}) {
  const peak = Math.max(1, ...(weeks ?? []).map((week) => week.count));
  return (
    <section className={tw("panel")} aria-labelledby="trend-heading">
      <div className={tw("panel-heading")}>
        <div>
          <h2 id="trend-heading">Tren temuan terverifikasi</h2>
          <p>Jumlah laporan kondisi tidak sehat di Karawang per tujuh hari berdasarkan tanggal pengamatan (WIB).</p>
        </div>
      </div>
      {cached && weeks && (
        <p className={tw("panel-note muted")} role="status">
          Menampilkan tren terakhir yang tersimpan.
        </p>
      )}
      {weeks ? (
        <ol className={tw("observed-trend")} aria-label="Jumlah temuan per periode">
          {weeks.map((week) => (
            <li key={week.startOn}>
              <strong>{number.format(week.count)} laporan</strong>
              <div className={tw("observed-trend-track")} aria-hidden="true">
                <span style={{ height: `${(week.count / peak) * 100}%` }} />
              </div>
              <span>
                {day.format(new Date(week.startOn))} – {day.format(new Date(week.endOn))}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={tw("empty")}>
          {loading ? "Memuat tren…" : "Tren belum tersedia. Buka radar saat terhubung untuk memuat data."}
        </p>
      )}
    </section>
  );
}
