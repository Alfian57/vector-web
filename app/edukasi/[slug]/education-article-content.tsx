import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { ArticleRichText } from "../article-rich-text";
import { educationPath } from "@/lib/routes";
import { getPublishedArticle } from "@/lib/server/education";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { RequestError } from "@/lib/server/http";
import { tw } from "@/lib/tw";

export async function EducationArticleContent({ params }: Pick<PageProps<"/edukasi/[slug]">, "params">) {
  await connection();
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof getPublishedArticle>>;
  try {
    article = await getPublishedArticle(slug);
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) notFound();
    throw error;
  }
  const account = await getAccount(await headers()).catch(() => null);
  await recordPageView(account, `${educationPath}/${slug}`);

  return (
    <main className={tw("mx-auto flex min-h-screen w-[min(calc(100%_-_2_*_clamp(16px,_5vw,_70px)),1080px)] flex-col")}>
      <header className={tw("flex min-h-[78px] items-center justify-between gap-3 border-b border-line")}>
        <Link href={educationPath} className={tw("font-[720] tracking-[.025em] text-forest")}>
          VEKTOR <span className={tw("mx-1 text-[#83937e]")}>·</span> Edukasi
        </Link>
        <Link
          className={tw(
            "inline-flex min-h-[42px] w-fit items-center justify-center gap-2 rounded-[7px] border border-line bg-surface px-[13px] py-[9px] text-[.87rem] leading-[1.25] font-[640] text-forest hover:bg-[#edf2e7]",
          )}
          href="/masuk"
        >
          Masuk
        </Link>
      </header>
      <article className={tw("mx-auto w-full max-w-[760px] py-[clamp(32px,_6vw,_66px)]")}>
        <Link className={tw("mb-[27px] block text-[.88rem] font-[660] text-forest")} href={educationPath}>
          ← Semua panduan
        </Link>
        <span
          className={tw(
            "w-fit self-start rounded-full bg-[#e7eee0] px-[9px] py-[5px] text-[.76rem] font-[680] text-[#3e6241]",
          )}
        >
          {article.category}
        </span>
        <h1 className={tw("mt-[14px] text-[clamp(2rem,_5vw,_3.6rem)] text-forest")}>{article.title}</h1>
        <p className={tw("mt-[14px] text-[1.09rem] leading-[1.65] text-muted")}>{article.summary}</p>
        <p className={tw("mt-[15px] text-[.82rem] text-[#6a796e]")}>
          Disusun oleh {article.author}
          {article.publishedAt
            ? ` · ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(article.publishedAt))}`
            : ""}
        </p>
        <div className={tw("education-rich-text")}>
          <ArticleRichText content={article.content} />
        </div>
        <aside
          className={tw(
            "mt-[38px] rounded-[4px_9px_9px_4px] border-s-[3px] border-[#658354] bg-[#e8eee0] px-[19px] py-[17px]",
          )}
        >
          <strong>Catatan lapangan</strong>
          <p className={tw("mt-[6px] text-[.9rem] leading-[1.55] text-muted")}>
            Kenali kondisi tanaman secara langsung dan konsultasikan temuan dengan penyuluh setempat. Panduan ini tidak
            menggantikan diagnosis atau rekomendasi perlakuan di lapangan.
          </p>
        </aside>
      </article>
      <footer
        className={tw(
          "mt-auto flex flex-wrap justify-between gap-[10px] py-[25px] text-[.82rem] text-muted [&_a]:font-[660] [&_a]:text-forest",
        )}
      >
        <Link href={educationPath}>Jelajahi panduan lain</Link>
        <Link href="/">Kembali ke beranda</Link>
      </footer>
    </main>
  );
}
