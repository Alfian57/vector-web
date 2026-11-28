import type { ObservedWeek } from "@/lib/domain";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";

const day = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const number = new Intl.NumberFormat("id-ID");
const compactNumber = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

export function ObservationTrend({
  weeks,
  loading,
  cached,
}: {
  weeks?: readonly ObservedWeek[];
  loading: boolean;
  cached: boolean;
}) {
  const recent = weeks?.slice(-4) ?? [];
  const peak = Math.max(1, ...recent.map((week) => week.count));

  return (
    <section className="dashboard-radar-widget dashboard-field-trend" aria-labelledby="trend-heading">
      <div className="dashboard-widget-heading">
        <h2 id="trend-heading">Tren temuan</h2>
        <p>{cached && recent.length ? "Cuplikan tersimpan" : "Karawang, 4 minggu"}</p>
      </div>
      {recent.length ? (
        <ol>
          {recent.map((week) => (
            <li key={week.startOn}>
              <div className="dashboard-field-trend-track">
                <div className="dashboard-field-trend-bar" style={{ height: `${(week.count / peak) * 100}%` }}>
                  <strong title={`${number.format(week.count)} laporan`}>
                    <span aria-hidden="true">
                      {week.count >= 1000 ? compactNumber.format(week.count) : number.format(week.count)}
                    </span>
                    <span className="sr-only">{number.format(week.count)} laporan</span>
                  </strong>
                </div>
              </div>
              <span className="sr-only">
                {day.format(new Date(week.startOn))} sampai {day.format(new Date(week.endOn))}
              </span>
              <span aria-hidden="true">{day.format(new Date(week.startOn))}</span>
            </li>
          ))}
        </ol>
      ) : loading ? (
        <DashboardSkeleton label="Memuat tren temuan…" kind="trend" />
      ) : (
        <DashboardState compact title="Riwayat mingguan belum tersedia" />
      )}
    </section>
  );
}
