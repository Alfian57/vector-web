import { headers } from "next/headers";
import { connection } from "next/server";
import { getEducationForAdmin, listEducationForAdmin } from "@/lib/server/education";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { uuid } from "@/lib/domain";
import { EducationEditor } from "./editor";
import { tw } from "@/lib/tw";

export default async function AdminEducationPage({ searchParams }: PageProps<"/admin/education">) {
  await connection();
  const account = await getAccount(await headers());
  if (account) await recordPageView(account, "/admin/education");
  const query = await searchParams;
  const articleId = typeof query.article === "string" ? uuid.safeParse(query.article) : null;
  const selected = articleId?.success ? await getEducationForAdmin(articleId.data) : null;
  const articles = await listEducationForAdmin(new URLSearchParams());
  return (
    <>
      <header className={tw("admin-heading")}>
        <div>
          <h1>Artikel edukasi</h1>
          <p>
            Tulis materi pengamatan yang praktis, sertakan sumber tepercaya, lalu terbitkan untuk seluruh pengunjung.
          </p>
        </div>
        <span className={tw("admin-badge")}>Editor konten</span>
      </header>
      <EducationEditor initial={articles.entries} initialHasMore={articles.hasMore} initialSelected={selected} />
    </>
  );
}
