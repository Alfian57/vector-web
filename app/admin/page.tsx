import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Activity, BookOpen, ClipboardCheck, Cloud, UserRound, Users } from "lucide-react";
import { adminOverview } from "@/lib/server/admin";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import type { AdminOverview } from "@/lib/domain";
import { AdminStat } from "./stat";
import { tw } from "@/lib/tw";

export default async function AdminHome() {
  await connection();
  const account = await getAccount(await headers());
  if (account) await recordPageView(account, "/admin");
  const data: AdminOverview = await adminOverview();
  const adminCount = data.accounts.admins;
  return (
    <>
      <header className={tw("admin-heading")}>
        <div>
          <h1>Ringkasan operasional</h1>
          <p>Pantau akun, laporan, konten edukasi, serta kesehatan proses latar VEKTOR.</p>
        </div>
        <span className={tw("admin-badge")}>Admin aktif</span>
      </header>
      <section className={tw("admin-stats")} aria-label="Ringkasan akun">
        <AdminStat
          label="Seluruh akun"
          value={data.accounts.total}
          note={`${data.accounts.banned} dinonaktifkan`}
          icon={Users}
        />
        <AdminStat label="Petani" value={data.accounts.farmers} note="Akun pemantauan lahan" icon={UserRound} />
        <AdminStat label="Petugas PPL" value={data.accounts.officers} note="Akun verifikasi" icon={ClipboardCheck} />
        <AdminStat label="Admin" value={adminCount} note="Akun pengelola" icon={Activity} />
      </section>
      <section className={tw("admin-stats")} aria-label="Ringkasan konten dan laporan">
        <AdminStat
          label="Menunggu verifikasi"
          value={data.reports.pending}
          note="Laporan petani"
          icon={ClipboardCheck}
        />
        <AdminStat
          label="Terverifikasi"
          value={data.reports.verified}
          note={`${data.reports.rejected} laporan ditolak`}
          icon={Activity}
        />
        <AdminStat
          label="Artikel terbit"
          value={data.education.published}
          note={`${data.education.draft} draf`}
          icon={BookOpen}
        />
        <AdminStat
          label="Antrean push"
          value={data.push.pending}
          note={`${data.push.failed} pengiriman gagal`}
          icon={Cloud}
        />
      </section>
      <div className={tw("admin-two-col")}>
        <section className={tw("admin-panel")}>
          <header className={tw("admin-section-title")}>
            <div>
              <h2>Kesehatan worker</h2>
              <p>Cuaca, radar, dan pengiriman notifikasi</p>
            </div>
          </header>
          <div className={tw("admin-panel-body")}>
            <ul className={tw("admin-status-list")}>
              {(["weather", "radar", "push", "log-prune"] as const).map((job) => {
                const status = data.worker.find((item) => item.job === job);
                const staleAfter = job === "log-prune" ? 26 * 60 * 60 * 1000 : 90_000;
                const stale = status
                  ? new Date(data.asOf).getTime() - new Date(status.lastAttemptAt).getTime() > staleAfter
                  : true;
                const failed = Boolean(status?.lastErrorCode) || stale || !status?.lastSuccessAt;
                return (
                  <li key={job}>
                    <span>
                      {job === "weather"
                        ? "Pembaruan cuaca"
                        : job === "radar"
                          ? "Agregasi radar"
                          : job === "push"
                            ? "Notifikasi push"
                            : "Retensi log"}
                    </span>
                    <span className={tw("admin-worker-detail")}>
                      <span className={tw(`admin-badge ${failed ? "bad" : ""}`)}>
                        {!status
                          ? "Belum ada sinyal"
                          : !status.lastSuccessAt && !status.lastErrorCode
                            ? "Belum berhasil"
                            : failed
                              ? (status.lastErrorCode ?? "Perlu diperiksa")
                              : "Berjalan"}
                      </span>
                      {status?.lastSuccessAt && (
                        <small>
                          Berhasil{" "}
                          {new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(
                            new Date(status.lastSuccessAt),
                          )}
                        </small>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p style={{ marginTop: 14 }}>
              Cuaca terakhir diperbarui{" "}
              {data.weatherFetchedAt
                ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(data.weatherFetchedAt),
                  )
                : "belum tersedia"}
              .
            </p>
          </div>
        </section>
        <section className={tw("admin-panel")}>
          <header className={tw("admin-section-title")}>
            <div>
              <h2>Pintasan pengelolaan</h2>
              <p>Kelola akses dan informasi yang dibaca petani.</p>
            </div>
          </header>
          <div className={tw("admin-panel-body admin-status-list")}>
            <Link className={tw("secondary")} href="/admin/accounts">
              Tinjau akun dan akses
            </Link>
            <Link className={tw("secondary")} href="/admin/education">
              Kelola artikel edukasi
            </Link>
            <Link className={tw("secondary")} href="/admin/logs">
              Buka log aktivitas
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
