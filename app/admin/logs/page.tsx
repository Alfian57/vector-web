import { headers } from "next/headers";
import { connection } from "next/server";
import { listActivityLogs } from "@/lib/server/admin";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { LogsPanel } from "./panel";

export default async function AdminLogsPage() {
  await connection();
  const account = await getAccount(await headers());
  if (account) await recordPageView(account, "/admin/logs");
  const initial = await listActivityLogs(new URLSearchParams());
  return <>
    <header className="admin-heading"><div><h1>Log aktivitas</h1><p>Riwayat akses, perubahan akun, artikel, dan status layanan. Isi sensitif seperti kata sandi, OTP, token, dan isi laporan tidak disimpan di log.</p></div><span className="admin-badge">Retensi 90 hari</span></header>
    <LogsPanel initial={initial.entries} />
  </>;
}
