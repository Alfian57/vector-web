"use client";

import { ArrowUpRight, CloudSun, ClipboardCheck, Droplets, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate, type ObservedWeek, type Weather } from "@/lib/domain";

const weatherMaxAge = 45 * 60_000;
const day = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const number = new Intl.NumberFormat("id-ID");

export function WeatherPanel({ weather, issue, loading }: { weather: Weather | null; issue: boolean; loading: boolean }) {
  const [now, setNow] = useState<number>();
  const observedAt = weather?.observedAt;
  useEffect(() => {
    if (!observedAt) return;
    const readTime = () => setNow(Date.now());
    const initial = window.setTimeout(readTime, 0);
    const timer = window.setInterval(readTime, 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [observedAt]);

  const expired = observedAt !== undefined && now !== undefined && now - Date.parse(observedAt) >= weatherMaxAge;
  return <section className="panel weather-panel">
    <div className="section-title"><CloudSun size={22} /><h2>Cuaca wilayah</h2></div>
    {weather ? <>
      <dl className="weather-list">
        <div><dt><Wind size={17} /> Kecepatan angin</dt><dd>{number.format(weather.windSpeed)} km/jam</dd></div>
        <div><dt><ArrowUpRight size={17} /> Arah asal angin</dt><dd>{weather.windDirection}°</dd></div>
        <div><dt><Droplets size={17} /> Kelembapan</dt><dd>{weather.humidity}%</dd></div>
      </dl>
      {expired && <p className="tag tag-pending" role="status">Data cuaca kedaluwarsa</p>}
      <p className="small muted">{issue ? "Observasi tersimpan" : "Observasi"} {formatDate(weather.observedAt)} WIB</p>
    </> : <p className="muted">{loading ? "Memuat cuaca…" : issue ? "Cuaca gagal diperbarui. Coba lagi saat layanan tersedia." : "Data cuaca belum tersedia."}</p>}
    <a className="text-link small" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
  </section>;
}

export function ObservationTrend({ weeks, cached, loading }: { weeks?: ObservedWeek[]; cached: boolean; loading: boolean }) {
  const peak = Math.max(1, ...(weeks ?? []).map((week) => week.count));
  return <section className="panel" aria-labelledby="trend-heading">
    <div className="panel-heading"><div><h2 id="trend-heading">Tren temuan terverifikasi</h2>
      <p>Jumlah laporan kondisi tidak sehat di Karawang per tujuh hari berdasarkan tanggal pengamatan (WIB).</p></div></div>
    {cached && weeks && <p className="panel-note muted" role="status">Menampilkan tren terakhir yang tersimpan.</p>}
    {weeks ? <ol className="observed-trend" aria-label="Jumlah temuan per periode">{weeks.map((week) => <li key={week.startOn}>
      <strong>{number.format(week.count)} laporan</strong>
      <div className="observed-trend-track" aria-hidden="true"><span style={{ height: `${week.count / peak * 100}%` }} /></div>
      <span>{day.format(new Date(week.startOn))} – {day.format(new Date(week.endOn))}</span>
    </li>)}</ol> : <p className="empty">{loading ? "Memuat tren…" : "Tren belum tersedia. Buka radar saat terhubung untuk memuat data."}</p>}
  </section>;
}

export function FieldGuide({ onReport }: { onReport: () => void }) {
  return <section className="panel" aria-labelledby="field-guide-heading">
    <div className="panel-heading"><div className="section-title"><ClipboardCheck size={21} /><h2 id="field-guide-heading">Panduan pemeriksaan di lahan</h2></div></div>
    <ol className="field-guide">
      <li>Periksa beberapa titik di petak. Catat lokasi dan waktu pengamatan serta bagian tanaman yang berubah.</li>
      <li>Ambil foto daun yang jelas dan catat jumlah rumpun yang terlihat bergejala. Masukkan dugaan jika Anda mengenalinya.</li>
      <li>Kirim laporan untuk diperiksa PPL. Gunakan catatan petugas untuk menentukan tindak lanjut di petak Anda.</li>
    </ol>
    <div className="panel-note"><button className="secondary" onClick={onReport}>Catat temuan di lahan</button></div>
  </section>;
}
