"use client";

import { Droplets } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate, type Weather } from "@/lib/domain";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";

const weatherMaxAge = 45 * 60_000;
const number = new Intl.NumberFormat("id-ID");
const windPoints = ["Utara", "Timur laut", "Timur", "Tenggara", "Selatan", "Barat daya", "Barat", "Barat laut"];

export function WeatherPanel({
  weather,
  issue,
  loading,
  onRetry,
}: {
  weather: Weather | null;
  issue: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  const [now, setNow] = useState<number>();
  const observedAt = weather?.observedAt;

  useEffect(() => {
    if (!observedAt) return;
    const readTime = () => setNow(Date.now());
    const initial = window.setTimeout(readTime, 0);
    const timer = window.setInterval(readTime, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [observedAt]);

  const expired = observedAt !== undefined && now !== undefined && now - Date.parse(observedAt) >= weatherMaxAge;
  const windDirection = (((weather?.windDirection ?? 0) % 360) + 360) % 360;

  return (
    <section className="dashboard-radar-widget dashboard-weather" aria-labelledby="weather-title">
      <div className="dashboard-widget-heading">
        <h2 id="weather-title">Cuaca wilayah</h2>
        <a className="dashboard-widget-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>
      </div>
      {weather ? (
        <>
          <dl className="dashboard-weather-measures">
            <div className="dashboard-weather-humidity">
              <dt>
                <Droplets size={16} aria-hidden="true" /> Kelembapan
              </dt>
              <dd>
                {number.format(weather.humidity)}
                <span>%</span>
              </dd>
            </div>
            <div className="dashboard-weather-wind">
              <dt>
                <span className="dashboard-wind-compass" aria-hidden="true">
                  <span className="dashboard-compass-north">U</span>
                  <span className="dashboard-compass-east">T</span>
                  <span className="dashboard-compass-south">S</span>
                  <span className="dashboard-compass-west">B</span>
                  <i className="dashboard-compass-needle" style={{ transform: `rotate(${windDirection}deg)` }} />
                </span>
                <span className="sr-only">Angin dari </span>
                {windPoints[Math.round(windDirection / 45) % windPoints.length]}
                {" · "}
                {number.format(windDirection)}°
              </dt>
              <dd>{number.format(weather.windSpeed)} km/jam</dd>
            </div>
          </dl>
          <div className="dashboard-weather-observation">
            {(expired || issue) && (
              <p className="dashboard-weather-notice" role="status">
                {expired ? "Data cuaca kedaluwarsa" : "Gagal memperbarui cuaca"}
              </p>
            )}
            <p>
              {issue ? "Observasi tersimpan" : "Observasi"} {formatDate(weather.observedAt)} WIB
            </p>
          </div>
        </>
      ) : loading ? (
        <DashboardSkeleton label="Memuat cuaca…" kind="weather" />
      ) : issue ? (
        <DashboardState
          compact
          kind="error"
          title="Cuaca gagal diperbarui"
          action={
            <button type="button" className="dashboard-inline-link" onClick={onRetry}>
              Coba lagi
            </button>
          }
        />
      ) : (
        <DashboardState compact title="Data cuaca belum tersedia" />
      )}
    </section>
  );
}
