"use client";

import Link from "next/link";
import { educationPath, officerPath, officerRequiredPath, radarPath, signInFor, whatsappLinkPath } from "@/lib/routes";
import { ArrowLeft, BookOpen, Radio, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, errorMessage } from "@/lib/client";
import { districtPath, findings, statuses, type District, type FollowUp, type Report } from "@/lib/domain";
import { Brand } from "../_components/brand";
import { FieldLabel } from "../_components/field-label";
import { Map } from "../_components/map";
import { ReportList } from "../_components/report-list";
import { useRadar } from "../_components/use-radar";
import { ActionsPanel } from "./actions-panel";
import { AidPanel } from "./aid-panel";
import { ReviewPanel } from "./review-panel";

export function Dashboard({ name, whatsappLinked }: { name: string; whatsappLinked: boolean }) {
  const [reports, setReports] = useState<Report[]>();
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState("pending");
  const [finding, setFinding] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtError, setDistrictError] = useState(false);
  const [revision, setRevision] = useState("");
  const radar = useRadar();
  const refreshRadar = radar.refresh;
  const summaries = radar.radar?.summaries;
  const visible = useMemo(() => finding ? summaries?.filter((row) => finding === row.finding) : summaries, [finding, summaries]);

  const load = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ scope: "ppl", status: filter, finding, page: String(page) });
    const [queue, follow] = await Promise.allSettled([
      api<{ reports: Report[]; hasMore: boolean }>(`reports?${params}`, { signal }),
      api<FollowUp[]>("ppl/follow-ups", { signal }),
    ]);
    if (signal?.aborted) return;
    if (queue.status === "rejected" && queue.reason instanceof ApiError) {
      if (queue.reason.status === 401) {
        window.location.replace(signInFor(officerPath));
        return;
      }
      if (queue.reason.status === 403) {
        window.location.replace(officerRequiredPath);
        return;
      }
    }
    if (queue.status === "fulfilled") {
      setReports(queue.value.reports);
      setHasMore(queue.value.hasMore);
    }
    if (follow.status === "fulfilled") setFollowUps(follow.value);
    const failure = queue.status === "rejected" ? queue : follow.status === "rejected" ? follow : null;
    setError(failure ? errorMessage(failure.reason) : "");
  }, [filter, finding, page]);

  useEffect(() => {
    const pending = new AbortController();
    const initial = setTimeout(() => void load(pending.signal), 0);
    const stream = new EventSource("/api/ppl/events");
    stream.addEventListener("refresh", (event: MessageEvent) => {
      setLive(true);
      setRevision(event.lastEventId);
      void load(pending.signal);
      void refreshRadar();
    });
    stream.onerror = () => setLive(false);
    return () => { clearTimeout(initial); pending.abort(); stream.close(); };
  }, [load, refreshRadar]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void fetch(districtPath, { signal }).then((response) => {
      if (!response.ok) throw new Error("Districts unavailable");
      return response.json() as Promise<{ features: { properties: District }[] }>;
    }).then(({ features }) => {
      if (!signal.aborted) setDistricts(features.map(({ properties }) => properties).sort((a, b) => a.name.localeCompare(b.name, "id")));
    }).catch(() => { if (!signal.aborted) setDistrictError(true); });
    return () => controller.abort();
  }, []);

  const report = reports?.find((row) => row.id === selected);

  function reviewed() {
    setMessage("Keputusan verifikasi tersimpan.");
    setSelected(undefined);
    void load();
    void refreshRadar();
  }

  function changeFilter(set: (input: string) => void, input: string) {
    set(input);
    setPage(0);
    setReports(undefined);
    setSelected(undefined);
  }

  return <div className="officer-layout">
    <header className="officer-top"><Brand /><div className="topbar-actions">
      <span className="account-name"><ShieldCheck size={17} /> {name}</span>
      {!whatsappLinked && <Link className="text-link small" href={`${whatsappLinkPath}&next=${encodeURIComponent(officerPath)}`}>Hubungkan WhatsApp</Link>}
      <Link className="secondary" href={educationPath}><BookOpen size={16} /> Edukasi</Link>
      <Link className="secondary" href={radarPath}><ArrowLeft size={16} /> Radar</Link>
    </div></header>
    <main className="content">
      <div className="page-heading"><div><h1>Dasbor PPL</h1><p>Verifikasi temuan dan tindak lanjut pemantauan padi di Karawang.</p></div>
        <span className={`connection ${live ? "" : "connection-offline"}`} role="status"><Radio size={15} /> {live ? "Terhubung langsung" : "Menyambungkan…"}</span>
      </div>
      {message && <p className="message" role="status">{message}</p>}
      {error && <p className="message error-text" role="alert">{error}</p>}
      <div className="radar-grid officer-grid">
        <section className="panel radar-panel">
          <div className="panel-heading"><div><h2>Peta radar</h2><p>{report ? `Lokasi laporan yang dipilih di ${report.districtName}` : "Agregat temuan terverifikasi per kecamatan"}</p></div></div>
          <Map summaries={visible} tileUrl={radar.tiles?.url} mapTilerKey={radar.tiles?.mapTilerKey}
            offlineMap={radar.offlineMap} selected={report} />
          <div className="map-footer legend"><span><i className="legend-cluster" /> Klaster aktif</span><span><i className="legend-observed" /> Sporadis</span></div>
        </section>
        <section className="panel queue-panel">
          <div className="panel-heading"><div><h2>Antrean laporan</h2><p>Pilih laporan untuk memeriksa foto dan lokasi.</p></div></div>
          <div className="panel-note form-two">
            <label><FieldLabel>Status laporan</FieldLabel><select value={filter} onChange={(event) => changeFilter(setFilter, event.target.value)}>
              <option value="">Semua status</option>
              {Object.entries(statuses).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select></label>
            <label><FieldLabel>Jenis temuan</FieldLabel><select value={finding} onChange={(event) => changeFilter(setFinding, event.target.value)}>
              <option value="">Semua temuan</option>
              {Object.entries(findings).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select></label>
          </div>
          {reports ? <ReportList reports={reports} active={selected} onSelect={(item) => { setSelected(item.id); setMessage(""); }} /> :
            <p className="empty">{error ? "Antrean belum tersedia." : "Memuat laporan…"}</p>}
          {(page > 0 || hasMore) && <div className="panel-note button-row"><button className="secondary" disabled={!page} onClick={() => setPage(page - 1)}>Sebelumnya</button>
            <button className="secondary" disabled={!hasMore} onClick={() => setPage(page + 1)}>Berikutnya</button></div>}
        </section>
      </div>
      {report && <section className="panel"><ReviewPanel key={report.id} report={report} onReviewed={reviewed} /></section>}
      {districtError && <p className="message error-text" role="alert">Daftar kecamatan belum tersedia.</p>}
      <ActionsPanel districts={districts} followUps={followUps} revision={revision} onChange={() => void load()} />
      <AidPanel districts={districts} revision={revision} />
    </main>
  </div>;
}
