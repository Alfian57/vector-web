"use client";

import Link from "next/link";
import { Bell, BookOpen, ClipboardList, CloudOff, LogOut, MapPin, Radio, Radar, RefreshCw, ScanLine, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ApiError, api, errorMessage } from "@/lib/client";
import { findings, formatDate, type Report } from "@/lib/domain";
import { offlineDb, type QueuedReport } from "@/lib/pwa/storage";
import { disconnectDevicePush } from "@/lib/pwa/push";
import { scheduleReports, syncReports } from "@/lib/pwa/sync";
import { accountUnavailablePath, adminPath, educationPath, officerPath, radarSection, radarSectionPath, signInFor, signInPath, whatsappLinkPath, type RadarSection } from "@/lib/routes";
import { Brand } from "./brand";
import { Alerts, Plots } from "./farmer-panels";
import { RadarView } from "./radar-view";
import { ReportForm } from "./report-form";
import { ReportList } from "./report-list";
import { useRadar } from "./use-radar";
import { useRadarSession } from "./use-radar-session";

const sections = [
  { id: "radar", text: "Radar", icon: Radar },
  { id: "reports", text: "Laporan", icon: ClipboardList },
  { id: "plots", text: "Petak", icon: MapPin },
  { id: "alerts", text: "Peringatan", icon: Bell },
] as const;
const viewChanged = "vektor-view-changed";

function subscribeToView(update: () => void) {
  window.addEventListener("popstate", update);
  window.addEventListener(viewChanged, update);
  return () => {
    window.removeEventListener("popstate", update);
    window.removeEventListener(viewChanged, update);
  };
}

function subscribeToNetwork(update: () => void) {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

export function FarmerApp() {
  const search = useSyncExternalStore(subscribeToView, () => window.location.search, () => "");
  const params = new URLSearchParams(search);
  const requestedSection = radarSection(params.get("view"));
  const accessNotice = params.get("notice");
  const online = useSyncExternalStore(subscribeToNetwork, () => navigator.onLine, () => true);
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [sent, setSent] = useState(0);
  const [reports, setReports] = useState<Report[]>();
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState("");
  const [listIssue, setListIssue] = useState(false);
  const [edit, setEdit] = useState<QueuedReport>();
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [discard, setDiscard] = useState<string>();

  const resetOwner = useCallback(() => {
    setQueue([]);
    setReports(undefined);
    setSent(0);
    setPage(0);
    setMore(false);
    setListIssue(false);
    setEdit(undefined);
    setDiscard(undefined);
  }, []);
  const { account, accountId, sessionIssue, loadSession, clearSession } = useRadarSession(resetOwner);
  const section = requestedSection;
  const radar = useRadar(Boolean(account));

  const loadQueue = useCallback(async (ownerId: string) => {
    const [items, count] = await Promise.all([
      offlineDb().queue.where("ownerId").equals(ownerId).toArray(),
      offlineDb().sent.where("ownerId").equals(ownerId).count(),
    ]);
    if (accountId.current !== ownerId) return;
    setQueue(items.sort((a, b) => b.report.observedAt.localeCompare(a.report.observedAt)));
    setSent(count);
  }, [accountId]);

  const loadReports = useCallback(async (nextPage: number) => {
    const owner = accountId.current;
    if (!owner) return;
    try {
      const value = await api<{ reports: Report[]; hasMore: boolean }>(`reports?page=${nextPage}`, {
        headers: { "x-vektor-account": owner },
      });
      if (accountId.current !== owner) return;
      setReports(value.reports);
      setMore(value.hasMore);
      setPage(nextPage);
      setListIssue(false);
    } catch (error) {
      if (accountId.current !== owner) return;
      if (error instanceof ApiError && error.status === 401) void loadSession();
      else setListIssue(true);
    }
  }, [accountId, loadSession]);

  const sync = useCallback(async (ownerId: string, currentPage = 0) => {
    setSyncing(true);
    try {
      await scheduleReports();
      await syncReports().catch(() => {});
      await Promise.all([loadQueue(ownerId), loadReports(currentPage)]);
    } catch { setMessage("Antrean perangkat belum dapat dibuka."); }
    finally { setSyncing(false); }
  }, [loadQueue, loadReports]);

  useEffect(() => {
    const connected = () => {
      void loadSession().then((user) => { if (user) void sync(user.id); });
    };
    connected();
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) connected();
    };
    window.addEventListener("online", connected);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", connected);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadSession, sync]);

  const ownerId = account?.id;
  useEffect(() => {
    if (!ownerId) return;
    const update = () => {
      void loadQueue(ownerId).catch(() => {});
      if (navigator.onLine) void loadReports(0);
    };
    const onWorker = (event: MessageEvent) => { if (event.data === "vektor-queue-changed") update(); };
    update();
    navigator.serviceWorker?.addEventListener("message", onWorker);
    return () => navigator.serviceWorker?.removeEventListener("message", onWorker);
  }, [ownerId, loadQueue, loadReports]);

  useEffect(() => {
    if (account || !online || signingOut) return;
    if (sessionIssue) window.location.replace(accountUnavailablePath);
    else if (account === null) window.location.replace(signInFor(radarSectionPath(section)));
  }, [account, online, section, sessionIssue, signingOut]);

  if (!account) return <main className="auth-layout">
    <Brand />
    <p role="status">{online ? "Memeriksa sesi…" : "Sambungkan perangkat ke internet untuk masuk."}</p>
  </main>;

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await disconnectDevicePush();
      await api("auth/sign-out", { method: "POST", signal: AbortSignal.timeout(8000) });
      await clearSession();
      window.location.replace(signInPath);
    } catch (error) {
      setMessage(errorMessage(error));
      setSigningOut(false);
    }
  }

  function navigate(next: RadarSection) {
    const path = radarSectionPath(next);
    if (path !== window.location.pathname + window.location.search) {
      window.history.pushState(null, "", path);
      window.dispatchEvent(new Event(viewChanged));
    }
    setMessage("");
    setEdit(undefined);
    if (next === "reports" && online) void loadReports(0);
    if (next === "radar" && online) void radar.refresh();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function saved() {
    if (!account) return;
    navigate("reports");
    setMessage("Laporan tersimpan di perangkat.");
    void loadQueue(account.id).then(() => {
      if (navigator.onLine) void sync(account.id);
      else void scheduleReports();
    }).catch(() => {});
  }

  return <div className="workspace">
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Navigasi utama">
        {sections.map(({ id, text, icon: Icon }) => <button key={id} className={section === id ? "active" : ""}
          aria-current={section === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={20} />{text}</button>)}
      </nav>
      <div className="sidebar-footer">
        <Link href={educationPath}><BookOpen size={19} /> Pusat edukasi</Link>
        {account.role === "officer" && <Link href={officerPath} prefetch={false}><ShieldCheck size={19} /> Dasbor PPL</Link>}
        {account.role === "admin" && <Link href={adminPath} prefetch={false}><ShieldCheck size={19} /> Panel Admin</Link>}
        <button onClick={() => void logout()} disabled={signingOut}><LogOut size={18} /> {signingOut ? "Sedang keluar…" : "Keluar"}</button>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="topbar">
        <span className="topbar-region">Pemantauan padi <span> / </span> Karawang</span>
        <div className="topbar-actions">
          <span className={`connection ${online ? "" : "connection-offline"}`} role="status">
            {online ? <Radio size={15} /> : <CloudOff size={15} />} {online ? "Daring" : "Offline"}
          </span>
          <span className="account-name">{account.name}</span>
          {!account.whatsappLinked && online && <Link href={whatsappLinkPath} className="text-link small">Hubungkan WhatsApp</Link>}
        </div>
      </header>
      <main className="content">
        {message && <p className="message" role="status">{message}</p>}
        {accessNotice === "ppl-required" && <p className="message" role="status">Dasbor PPL hanya tersedia untuk akun petugas.</p>}
        {accessNotice === "admin-required" && <p className="message" role="status">Panel pengelolaan hanya tersedia untuk akun Admin.</p>}
        {online && sessionIssue && <p className="message" role="status">
          Layanan akun sedang tidak tersedia. <button className="text-link" onClick={() => void loadSession().then((user) => {
            if (user) void sync(user.id);
          })}>Coba lagi</button>
        </p>}
        {section === "radar" ? <RadarView data={radar} onReport={() => navigate("create")} /> :
          section === "create" ? <ReportForm key={edit?.id ?? "new"} ownerId={account.id} edit={edit} onSaved={saved}
            tiles={radar.tiles} offlineMap={radar.offlineMap} /> :
          section === "plots" ? <Plots tiles={radar.tiles} offlineMap={radar.offlineMap} /> :
          section === "alerts" ? <Alerts key={account.id} /> : <>
            <div className="page-heading"><div><h1>Laporan saya</h1><p>Pantau laporan dari perangkat hingga verifikasi PPL.</p></div>
              <button className="primary" onClick={() => navigate("create")}><ScanLine size={18} /> Buat laporan</button></div>
            <section className="panel">
              <div className="panel-heading"><div><h2>Antrean perangkat</h2><p>{queue.length} tersimpan · {sent} terkirim dari perangkat ini</p></div>
                <button className="secondary" onClick={() => void sync(account.id, page)} disabled={!online || syncing}>
                  <RefreshCw size={16} /> {syncing ? "Menyinkronkan…" : "Sinkronkan"}
                </button>
              </div>
              {queue.length ? <ul className="list">{queue.map((item) => <li key={item.id}>
                <div><strong>{findings[item.report.finding]}</strong><p>{formatDate(item.report.observedAt)} WIB</p>
                  <p className={item.error ? "error-text" : undefined}>{item.error ?? "Menunggu sinkronisasi"}</p></div>
                {item.error && <div className="button-row">
                  <button className="secondary" onClick={() => { navigate("create"); setEdit(item); }}>Perbaiki</button>
                  <button className="secondary" onClick={() => setDiscard(item.id)}>Hapus</button>
                </div>}
              </li>)}</ul> : <p className="empty">Antrean kosong.</p>}
              {discard && <div className="panel-note" role="group" aria-label="Konfirmasi hapus laporan lokal">
                <p>Hapus laporan dan foto yang tersimpan di perangkat?</p><div className="button-row">
                  <button className="secondary" onClick={() => setDiscard(undefined)}>Batal</button>
                  <button className="danger" onClick={() => {
                    void offlineDb().queue.delete(discard).then(() => loadQueue(account.id)).then(() => setDiscard(undefined))
                      .catch(() => setMessage("Laporan belum dapat dihapus."));
                  }}>Hapus laporan</button>
                </div>
              </div>}
            </section>
            <section className="panel">
              <div className="panel-heading"><div><h2>Laporan terkirim</h2></div>
                <div className="button-row">
                  <button className="secondary" disabled={!page || !online} onClick={() => void loadReports(page - 1)}>Sebelumnya</button>
                  <button className="secondary" disabled={!more || !online} onClick={() => void loadReports(page + 1)}>Berikutnya</button>
                </div>
              </div>
              {!online && <p className="panel-note" role="status">{reports
                ? "Status terakhir saat terhubung. Buka kembali saat daring untuk pembaruan."
                : "Riwayat laporan terkirim tersedia saat perangkat terhubung."}</p>}
              {online && listIssue && <p className="panel-note" role="status">Status terbaru belum tersedia. Periksa koneksi Anda.</p>}
              {reports ? <ReportList reports={reports} /> : online && !listIssue && <p className="empty">Memuat laporan…</p>}
            </section>
          </>}
      </main>
    </div>
  </div>;
}
