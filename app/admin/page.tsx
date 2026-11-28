import Link from "next/link";
import { adminOverview } from "@/lib/server/admin";
import { adminAccountsPath, adminEducationPath, adminLogsPath, adminPath } from "@/lib/routes";
import { ActionIcon } from "@/app/_components/action-icon";
import { DataTable } from "@/app/_components/data-table";
import type { AdminOverview } from "@/lib/domain";
import { tw } from "@/lib/tw";
import { recordAdminPage } from "./protected-page";
import { AdminPageBoundary } from "./page-boundary";

const number = new Intl.NumberFormat("id-ID");
const workerTime = new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: "Asia/Jakarta" });
const workerDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
const workerJobs = [
  ["weather", "Pembaruan cuaca"],
  ["radar", "Agregasi radar"],
  ["push", "Notifikasi push"],
  ["log-prune", "Retensi log"],
] as const;

function ReportWorkload({ reports }: { reports: AdminOverview["reports"] }) {
  const outcomes = [
    ["Menunggu verifikasi", reports.pending, "pending"],
    ["Terverifikasi", reports.verified, "verified"],
    ["Ditolak", reports.rejected, "rejected"],
  ] as const;
  const total = reports.pending + reports.verified + reports.rejected;

  return (
    <section className="dashboard-admin-workload" aria-labelledby="admin-workload-title">
      <h2 id="admin-workload-title">Beban verifikasi</h2>
      <p className="dashboard-admin-workload-lead">
        <strong className="dashboard-admin-number">{number.format(reports.pending)}</strong>
        <span>laporan menunggu verifikasi</span>
      </p>
      {total > 0 && (
        <div className="dashboard-admin-workload-track" aria-hidden="true">
          {outcomes.map(([label, count, status]) => (
            <span key={label} className={`dashboard-admin-workload-${status}`} style={{ flexGrow: count }} />
          ))}
        </div>
      )}
      <dl className="dashboard-admin-workload-labels">
        {outcomes.map(([label, count, status]) => (
          <div key={label}>
            <dt>
              <span className={`dashboard-admin-workload-${status}`} aria-hidden="true" />
              {label}
            </dt>
            <dd>{number.format(count)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WorkerHealth({ data }: { data: AdminOverview }) {
  const asOf = Date.parse(data.asOf);
  return (
    <section className={tw("admin-panel")} aria-labelledby="worker-title">
      <header className={tw("admin-section-title")}>
        <h2 id="worker-title">Kesehatan worker</h2>
        <Link className="dashboard-inline-link" href={adminLogsPath}>
          Log aktivitas
        </Link>
      </header>
      <div className={tw("admin-panel-body")}>
        <DataTable label="Kesehatan worker" columns={["Proses", "Status", "Terakhir berhasil"]}>
          {workerJobs.map(([job, label]) => {
            const status = data.worker.find((item) => item.job === job);
            const staleAfter = job === "log-prune" ? 26 * 60 * 60 * 1000 : 90_000;
            const stale = status ? asOf - Date.parse(status.lastAttemptAt) > staleAfter : true;
            const failed = Boolean(status?.lastErrorCode) || stale || !status?.lastSuccessAt;
            return (
              <tr key={job}>
                <th scope="row">{label}</th>
                <td>
                  <span className={tw(`admin-badge ${failed ? "bad" : "tag-verified"}`)}>
                    {!status
                      ? "Belum ada sinyal"
                      : !status.lastSuccessAt && !status.lastErrorCode
                        ? "Belum berhasil"
                        : failed
                          ? (status.lastErrorCode ?? "Perlu diperiksa")
                          : "Berjalan"}
                  </span>
                </td>
                <td>{status?.lastSuccessAt ? workerTime.format(new Date(status.lastSuccessAt)) + " WIB" : "—"}</td>
              </tr>
            );
          })}
        </DataTable>
        <p className="dashboard-admin-worker-time">
          Cuaca{" "}
          {data.weatherFetchedAt
            ? `diperbarui ${workerDate.format(new Date(data.weatherFetchedAt))} WIB`
            : "belum tersedia"}
          .
        </p>
      </div>
    </section>
  );
}

export default function AdminHome() {
  return (
    <AdminPageBoundary label="Memuat ringkasan operasional…" kind="overview">
      <AdminHomeContent />
    </AdminPageBoundary>
  );
}

async function AdminHomeContent() {
  await recordAdminPage(adminPath);
  const data = await adminOverview();

  return (
    <>
      <header className={tw("admin-heading")}>
        <div>
          <h1>Ringkasan operasional</h1>
          <p>Laporan, status proses, dan pengelolaan VEKTOR.</p>
        </div>
      </header>
      <div className="dashboard-operational-grid">
        <ReportWorkload reports={data.reports} />
        <WorkerHealth data={data} />
      </div>
      <section className={tw("admin-panel dashboard-admin-management")} aria-labelledby="admin-management-title">
        <header className={tw("admin-section-title")}>
          <h2 id="admin-management-title">Pengelolaan</h2>
        </header>
        <DataTable label="Ringkasan pengelolaan" columns={["Area", "Ringkasan", "Aksi"]}>
          <tr>
            <th scope="row">Akun dan akses</th>
            <td>
              {number.format(data.accounts.total)} akun, termasuk {number.format(data.accounts.farmers)} petani,{" "}
              {number.format(data.accounts.officers)} PPL, dan {number.format(data.accounts.admins)} admin.{" "}
              {number.format(data.accounts.banned)} akun dinonaktifkan.
            </td>
            <td>
              <ActionIcon
                href={adminAccountsPath}
                label="Kelola akun"
                icon="user"
              />
            </td>
          </tr>
          <tr>
            <th scope="row">Edukasi</th>
            <td>
              {number.format(data.education.published)} artikel terbit, {number.format(data.education.draft)} draf
            </td>
            <td>
              <ActionIcon
                href={adminEducationPath}
                label="Kelola edukasi"
                icon="book"
              />
            </td>
          </tr>
          <tr>
            <th scope="row">Notifikasi push</th>
            <td>
              {number.format(data.push.pending)} menunggu, {number.format(data.push.failed)} gagal
            </td>
            <td>
              <ActionIcon
                href={adminLogsPath}
                label="Lihat log"
                icon="logs"
              />
            </td>
          </tr>
        </DataTable>
      </section>
    </>
  );
}
