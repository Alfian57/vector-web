import { headers } from "next/headers";
import { connection } from "next/server";
import { listActivityLogs } from "@/lib/server/admin";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { LogsPanel } from "./panel";
import { tw } from "@/lib/tw";

export default async function AdminLogsPage({ searchParams }: PageProps<"/admin/logs">) {
  await connection();
  const account = await getAccount(await headers());
  if (account) await recordPageView(account, "/admin/logs");
  const query = await searchParams;
  const initialQuery = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const params = new URLSearchParams();
  if (initialQuery) params.set("q", initialQuery);
  const initial = await listActivityLogs(params);
  return (
    <>
      <header className={tw("admin-heading")}>
        <div>
          <h1>Log aktivitas</h1>
          <p>
            Riwayat akses, perubahan akun, artikel, dan status layanan. Isi sensitif seperti kata sandi, OTP, token, dan
            isi laporan tidak disimpan di log.
          </p>
        </div>
        <span className={tw("admin-badge")}>Retensi 90 hari</span>
      </header>
      <LogsPanel initial={initial.entries} initialQuery={initialQuery} />
    </>
  );
}
