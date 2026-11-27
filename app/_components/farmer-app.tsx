"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  ClipboardList,
  CloudOff,
  MapPin,
  Radio,
  Radar,
  RefreshCw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { findings, formatDate } from "@/lib/domain";
import { disconnectDevicePush } from "@/lib/pwa/push";
import {
  adminPath,
  educationPath,
  officerPath,
  radarSection,
  radarSectionPath,
  whatsappLinkPath,
  type RadarSection,
} from "@/lib/routes";
import { DashboardGlobalSearch } from "./dashboard-global-search";
import { radarSearchItems } from "./radar-search-items";
import { AdminGlobalSearch } from "@/app/admin/global-search";
import { AccountMenu } from "./account-menu";
import { Brand } from "./brand";
import { Alerts, Plots } from "./farmer-panels";
import { RadarView } from "./radar-view";
import { ReportForm } from "./report-form";
import { ReportList } from "./report-list";
import { useRadar } from "./use-radar";
import { useFarmerWorkspace } from "./use-farmer-workspace";
import { tw } from "@/lib/tw";

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

export function FarmerApp() {
  const search = useSyncExternalStore(
    subscribeToView,
    () => window.location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  const requestedSection = radarSection(params.get("view"));
  const {
    account,
    online,
    sessionIssue,
    clearSession,
    queue,
    sent,
    reports,
    page,
    more,
    message,
    listIssue,
    edit,
    syncing,
    discard,
    loadReports,
    clearMessage,
    editReport,
    discardReport,
    cancelDiscard,
    confirmDiscard,
    reportSaved,
    retrySession,
    syncCurrentPage,
    clearEdit,
  } = useFarmerWorkspace(requestedSection);
  const accessNotice = params.get("notice");
  const section = requestedSection;
  const radar = useRadar(Boolean(account));

  if (!account)
    return (
      <main className={tw("auth-layout")}>
        <Brand />
        <p role="status">{online ? "Memeriksa sesi…" : "Sambungkan perangkat ke internet untuk masuk."}</p>
      </main>
    );

  function navigate(next: RadarSection) {
    const path = radarSectionPath(next);
    if (path !== window.location.pathname + window.location.search) {
      window.history.pushState(null, "", path);
      window.dispatchEvent(new Event(viewChanged));
    }
    clearMessage();
    clearEdit();
    if (next === "reports" && online) void loadReports(0);
    if (next === "radar" && online) void radar.refresh();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function saved() {
    if (!account) return;
    navigate("reports");
    reportSaved();
  }

  return (
    <div className={tw("workspace")}>
      <aside className={tw("sidebar")}>
        <Brand />
        <nav aria-label="Navigasi utama">
          {sections.map(({ id, text, icon: Icon }) => (
            <button
              key={id}
              className={tw(section === id ? "active" : "")}
              aria-current={section === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              {text}
            </button>
          ))}
        </nav>
        <div className={tw("sidebar-footer")}>
          <Link href={educationPath}>
            <BookOpen size={19} /> Pusat edukasi
          </Link>
          {account.role === "officer" && (
            <Link href={officerPath} prefetch={false}>
              <ShieldCheck size={19} /> Dasbor PPL
            </Link>
          )}
          {account.role === "admin" && (
            <Link href={adminPath} prefetch={false}>
              <ShieldCheck size={19} /> Panel Admin
            </Link>
          )}
        </div>
      </aside>
      <div className={tw("workspace-body")}>
        <header className={tw("topbar")}>
          <span className={tw("topbar-region")}>
            Pemantauan padi <span> / </span> Karawang
          </span>
          <div className={tw("topbar-actions")}>
            {account.role === "admin" ? (
              <AdminGlobalSearch />
            ) : (
              <DashboardGlobalSearch
                items={radarSearchItems(account.role, navigate)}
                onSelectEntry={(entry) => {
                  if (account.role !== "farmer") return false;
                  if (entry.kind === "report") navigate("reports");
                  else if (entry.kind === "plot") navigate("plots");
                  else if (entry.kind === "alert") navigate("alerts");
                  else return false;
                  return true;
                }}
              />
            )}
            <span className={tw(`connection ${online ? "" : "connection-offline"}`)} role="status">
              {online ? <Radio size={15} /> : <CloudOff size={15} />} {online ? "Daring" : "Offline"}
            </span>
            <AccountMenu account={account} beforeSignOut={disconnectDevicePush} afterSignOut={clearSession} />
            {!account.whatsappLinked && online && (
              <Link href={whatsappLinkPath} className={tw("text-link small")}>
                Hubungkan WhatsApp
              </Link>
            )}
          </div>
        </header>
        <main className={tw("content")}>
          {message && (
            <p className={tw("message")} role="status">
              {message}
            </p>
          )}
          {accessNotice === "ppl-required" && (
            <p className={tw("message")} role="status">
              Dasbor PPL hanya tersedia untuk akun petugas.
            </p>
          )}
          {accessNotice === "admin-required" && (
            <p className={tw("message")} role="status">
              Panel pengelolaan hanya tersedia untuk akun Admin.
            </p>
          )}
          {online && sessionIssue && (
            <p className={tw("message")} role="status">
              Layanan akun sedang tidak tersedia.{" "}
              <button className={tw("text-link")} onClick={() => void retrySession()}>
                Coba lagi
              </button>
            </p>
          )}
          {section === "radar" ? (
            <RadarView data={radar} onReport={() => navigate("create")} />
          ) : section === "create" ? (
            <ReportForm
              key={edit?.id ?? "new"}
              ownerId={account.id}
              edit={edit}
              onSaved={saved}
              tiles={radar.tiles}
              offlineMap={radar.offlineMap}
            />
          ) : section === "plots" ? (
            <Plots tiles={radar.tiles} offlineMap={radar.offlineMap} />
          ) : section === "alerts" ? (
            <Alerts key={account.id} />
          ) : (
            <>
              <div className={tw("page-heading")}>
                <div>
                  <h1>Laporan saya</h1>
                  <p>Pantau laporan dari perangkat hingga verifikasi PPL.</p>
                </div>
                <button className={tw("primary")} onClick={() => navigate("create")}>
                  <ScanLine size={18} /> Buat laporan
                </button>
              </div>
              <section className={tw("panel")}>
                <div className={tw("panel-heading")}>
                  <div>
                    <h2>Antrean perangkat</h2>
                    <p>
                      {queue.length} tersimpan · {sent} terkirim dari perangkat ini
                    </p>
                  </div>
                  <button className={tw("secondary")} onClick={syncCurrentPage} disabled={!online || syncing}>
                    <RefreshCw size={16} /> {syncing ? "Menyinkronkan…" : "Sinkronkan"}
                  </button>
                </div>
                {queue.length ? (
                  <ul className={tw("list")}>
                    {queue.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{findings[item.report.finding]}</strong>
                          <p>{formatDate(item.report.observedAt)} WIB</p>
                          <p className={tw(item.error ? "error-text" : undefined)}>
                            {item.error ?? "Menunggu sinkronisasi"}
                          </p>
                        </div>
                        {item.error && (
                          <div className={tw("button-row")}>
                            <button
                              className={tw("secondary")}
                              onClick={() => {
                                navigate("create");
                                editReport(item);
                              }}
                            >
                              Perbaiki
                            </button>
                            <button className={tw("secondary")} onClick={() => discardReport(item.id)}>
                              Hapus
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={tw("empty")}>Antrean kosong.</p>
                )}
                {discard && (
                  <div className={tw("panel-note")} role="group" aria-label="Konfirmasi hapus laporan lokal">
                    <p>Hapus laporan dan foto yang tersimpan di perangkat?</p>
                    <div className={tw("button-row action-row")}>
                      <button className={tw("secondary")} onClick={cancelDiscard}>
                        Batal
                      </button>
                      <button className={tw("danger")} onClick={() => void confirmDiscard()}>
                        Hapus laporan
                      </button>
                    </div>
                  </div>
                )}
              </section>
              <section className={tw("panel")}>
                <div className={tw("panel-heading")}>
                  <div>
                    <h2>Laporan terkirim</h2>
                  </div>
                  <div className={tw("button-row")}>
                    <button
                      className={tw("secondary")}
                      disabled={!page || !online}
                      onClick={() => void loadReports(page - 1)}
                    >
                      Sebelumnya
                    </button>
                    <button
                      className={tw("secondary")}
                      disabled={!more || !online}
                      onClick={() => void loadReports(page + 1)}
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
                {!online && (
                  <p className={tw("panel-note")} role="status">
                    {reports
                      ? "Status terakhir saat terhubung. Buka kembali saat daring untuk pembaruan."
                      : "Riwayat laporan terkirim tersedia saat perangkat terhubung."}
                  </p>
                )}
                {online && listIssue && (
                  <p className={tw("panel-note")} role="status">
                    Status terbaru belum tersedia. Periksa koneksi Anda.
                  </p>
                )}
                {reports ? (
                  <ReportList reports={reports} />
                ) : (
                  online && !listIssue && <p className={tw("empty")}>Memuat laporan…</p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
