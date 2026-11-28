import { AdminPageBoundary } from "../page-boundary";
import { listActivityLogs } from "@/lib/server/admin";
import { adminLogsPath } from "@/lib/routes";
import { recordAdminPage } from "../protected-page";
import { LogsPanel } from "./panel";
import { tw } from "@/lib/tw";
import { dateOnlyToJakartaIso, parsePageIndex } from "@/lib/query-state";

export default function AdminLogsPage({ searchParams }: PageProps<"/admin/logs">) {
  return (
    <AdminPageBoundary label="Memuat log aktivitas…">
      <AdminLogsContent searchParams={searchParams} />
    </AdminPageBoundary>
  );
}

async function AdminLogsContent({ searchParams }: { searchParams: PageProps<"/admin/logs">["searchParams"] }) {
  await recordAdminPage(adminLogsPath);
  const query = await searchParams;
  const initialQuery = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const initialAccount = typeof query.account === "string" ? query.account.trim().slice(0, 100) : "";
  const params = new URLSearchParams();
  if (initialQuery) params.set("q", initialQuery);
  if (initialAccount) params.set("account", initialAccount);
  const kind = query.kind === "audit" || query.kind === "system" ? query.kind : "";
  const categories = new Set(["account", "education", "page", "worker", "auth", "api"]);
  const category = typeof query.category === "string" && categories.has(query.category) ? query.category : "";
  const from = typeof query.from === "string" && dateOnlyToJakartaIso(query.from, "start") ? query.from : "";
  const to = typeof query.to === "string" && dateOnlyToJakartaIso(query.to, "end") ? query.to : "";
  const initialPage = parsePageIndex(typeof query.page === "string" ? query.page : undefined);
  if (kind) params.set("kind", kind);
  if (category) params.set("category", category);
  const fromIso = from ? dateOnlyToJakartaIso(from, "start") : undefined;
  const toIso = to ? dateOnlyToJakartaIso(to, "end") : undefined;
  if (fromIso) params.set("from", fromIso);
  if (toIso) params.set("to", toIso);
  if (initialPage) params.set("page", String(initialPage));
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
      <LogsPanel
        initial={initial.entries}
        initialTotalPages={initial.totalPages}
      />
    </>
  );
}
