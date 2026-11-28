"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CloudOff, Radio } from "lucide-react";
import { prepareRadarShell } from "@/lib/pwa/radar-shell";
import { disconnectDevicePush } from "@/lib/pwa/push";
import { dashboardForRole, radarReportsPath, radarScreen, whatsappLinkPath, type RadarScreen } from "@/lib/routes";
import { DashboardWorkspace } from "./dashboard-workspace";
import { DashboardPageSkeleton, DashboardSkeleton, DashboardState } from "./dashboard-state";
import { Plots } from "./plots";
import { FarmerReports } from "./farmer-reports";
import { RadarView } from "./radar-view";
import { ReportForm } from "./report-form";
import { useRadar } from "./use-radar";
import { useFarmerWorkspace } from "./use-farmer-workspace";
import { showToast } from "./toast";
import { patchBrowserQuery } from "@/lib/query-state";
import { tw } from "@/lib/tw";

const notices: Record<string, string> = {
  "ppl-required": "Dasbor PPL hanya tersedia untuk akun petugas.",
  "admin-required": "Panel pengelolaan hanya tersedia untuk akun Admin.",
  "report-saved": "Laporan tersimpan di perangkat.",
};

export function FarmerApp({ initialScreen }: { initialScreen: RadarScreen }) {
  const pathname = usePathname();
  const params = useSearchParams();
  // When the worker serves the cached Radar document, the browser keeps the requested URL.
  const screen = initialScreen.section === "radar" ? (radarScreen(pathname) ?? initialScreen) : initialScreen;
  const destination = `${pathname}${params.size ? `?${params}` : ""}`;
  const workspace = useFarmerWorkspace(destination, screen.section === "reports");
  const { account, online, sessionIssue, clearSession, retrySession, queue, queueReady, queueIssue, message } =
    workspace;
  const radar = useRadar(account?.role === "farmer" && ["radar", "reports", "plots", "edit"].includes(screen.section));
  const noticeCode = params.get("notice") ?? "";
  const notice = notices[noticeCode];
  const lastAnnouncedNotice = useRef("");
  const edit = screen.section === "edit" ? queue.find((item) => item.id === screen.id && item.error) : undefined;

  const signedIn = account?.role === "farmer";
  useEffect(() => {
    if (!notice) {
      lastAnnouncedNotice.current = "";
      return;
    }
    if (lastAnnouncedNotice.current === noticeCode) return;
    lastAnnouncedNotice.current = noticeCode;
    showToast(notice, noticeCode === "report-saved" ? "success" : "error");
    patchBrowserQuery({ notice: null }, "replace");
  }, [notice, noticeCode]);

  useEffect(() => {
    if (!online || !signedIn || !navigator.serviceWorker) return;
    let current = true;
    void navigator.serviceWorker.ready
      .then((registration) => {
        if (current && registration.active) return prepareRadarShell(registration.active);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [online, signedIn]);

  if (!account) {
    if (!online && account === null) {
      return (
        <main className="dashboard-theme dashboard-bootstrap">
          <DashboardState
            kind="offline"
            title="Sambungkan perangkat untuk masuk"
            description="Radar offline tersedia setelah perangkat menyiapkan sesi dan peta."
          />
        </main>
      );
    }
    return (
      <DashboardPageSkeleton
        label="Memeriksa sesi…"
        kind={initialScreen.section === "radar" ? "map" : initialScreen.section === "edit" ? "report-form" : "table"}
      />
    );
  }

  if (account.role !== "farmer") {
    const home = dashboardForRole(account.role);
    return (
      <main className="dashboard-theme dashboard-bootstrap">
        <DashboardState
          kind="error"
          title="Radar Petani hanya tersedia untuk akun Petani"
          description="Gunakan menu dan fitur yang tersedia di dashboard sesuai peran akun Anda."
        />
        <a className={tw("secondary")} href={home}>
          Buka dashboard Anda
        </a>
      </main>
    );
  }

  return (
    <DashboardWorkspace
      account={account}
      workspace="radar"
      beforeSignOut={disconnectDevicePush}
      afterSignOut={clearSession}
      whatsappHref={
        !account.whatsappLinked && online ? `${whatsappLinkPath}&next=${encodeURIComponent(destination)}` : undefined
      }
      status={
        <span className={`dashboard-connection${online ? "" : "dashboard-connection--offline"}`} role="status">
          {online ? <Radio size={15} aria-hidden="true" /> : <CloudOff size={15} aria-hidden="true" />}
          {online ? "Daring" : "Offline"}
        </span>
      }
    >
      {message && <DashboardState title={message} kind="error" compact />}
      {online && sessionIssue && (
        <p className={tw("message")} role="status">
          Layanan akun sedang tidak tersedia.{" "}
          <button className={tw("text-link")} onClick={() => void retrySession()}>
            Coba lagi
          </button>
        </p>
      )}
      {screen.section === "radar" && (
        <RadarView
          data={radar}
          readiness={{
            online,
            queueReady,
            queueIssue,
            queued: queue.length,
            needsReview: queue.filter((item) => item.error).length,
          }}
        />
      )}
      {screen.section === "reports" && (
        <FarmerReports {...workspace} ownerId={account.id} tiles={radar.tiles} offlineMap={radar.offlineMap} />
      )}
      {screen.section === "plots" && <Plots tiles={radar.tiles} offlineMap={radar.offlineMap} />}
      {screen.section === "edit" && (
        <>
          <a href={radarReportsPath} className={tw("text-link")}>
            Kembali ke laporan
          </a>
          {screen.section === "edit" && !edit ? (
            queueIssue ? (
              <DashboardState kind="error" title="Antrean perangkat belum dapat dibuka" />
            ) : queueReady ? (
              <div className={tw("panel panel-note")}>
                <h1>Laporan tidak ditemukan</h1>
                <p>Laporan yang perlu diperbaiki tidak tersedia untuk akun ini di perangkat.</p>
              </div>
            ) : (
              <DashboardSkeleton kind="report-form" label="Memuat laporan lokal…" />
            )
          ) : (
            <ReportForm
              key={edit?.id ?? "new"}
              ownerId={account.id}
              edit={edit}
              onSaved={() => window.location.assign(`${radarReportsPath}?notice=report-saved`)}
              tiles={radar.tiles}
              offlineMap={radar.offlineMap}
            />
          )}
        </>
      )}
    </DashboardWorkspace>
  );
}
