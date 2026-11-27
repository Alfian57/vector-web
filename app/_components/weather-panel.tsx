"use client";

import { ArrowUpRight, CloudSun, Droplets, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate, type Weather } from "@/lib/domain";
import { tw } from "@/lib/tw";

const weatherMaxAge = 45 * 60_000;
const number = new Intl.NumberFormat("id-ID");

export function WeatherPanel({
  weather,
  issue,
  loading,
}: {
  weather: Weather | null;
  issue: boolean;
  loading: boolean;
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
  return (
    <section className={tw("panel weather-panel")}>
      <div className={tw("section-title")}>
        <CloudSun size={22} />
        <h2>Cuaca wilayah</h2>
      </div>
      {weather ? (
        <>
          <dl className={tw("weather-list")}>
            <div>
              <dt>
                <Wind size={17} /> Kecepatan angin
              </dt>
              <dd>{number.format(weather.windSpeed)} km/jam</dd>
            </div>
            <div>
              <dt>
                <ArrowUpRight size={17} /> Arah asal angin
              </dt>
              <dd>{weather.windDirection}°</dd>
            </div>
            <div>
              <dt>
                <Droplets size={17} /> Kelembapan
              </dt>
              <dd>{weather.humidity}%</dd>
            </div>
          </dl>
          {expired && (
            <p className={tw("tag tag-pending")} role="status">
              Data cuaca kedaluwarsa
            </p>
          )}
          <p className={tw("small muted")}>
            {issue ? "Observasi tersimpan" : "Observasi"} {formatDate(weather.observedAt)} WIB
          </p>
        </>
      ) : (
        <p className={tw("muted")}>
          {loading
            ? "Memuat cuaca…"
            : issue
              ? "Cuaca gagal diperbarui. Coba lagi saat layanan tersedia."
              : "Data cuaca belum tersedia."}
        </p>
      )}
      <a className={tw("text-link small")} href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Open-Meteo
      </a>
    </section>
  );
}
