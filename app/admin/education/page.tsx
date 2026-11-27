import { headers } from "next/headers";
import { connection } from "next/server";
import { listEducationForAdmin } from "@/lib/server/education";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { EducationEditor } from "./editor";

export default async function AdminEducationPage() {
  await connection();
  const account = await getAccount(await headers());
  if (account) await recordPageView(account, "/admin/education");
  const articles = await listEducationForAdmin(new URLSearchParams());
  return <>
    <header className="admin-heading"><div><h1>Artikel edukasi</h1><p>Tulis materi pengamatan yang praktis, sertakan sumber tepercaya, lalu terbitkan untuk seluruh pengunjung.</p></div><span className="admin-badge">Editor konten</span></header>
    <EducationEditor initial={articles.entries} initialHasMore={articles.hasMore} />
  </>;
}
