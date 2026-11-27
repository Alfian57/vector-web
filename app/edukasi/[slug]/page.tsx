import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { ArticleRichText } from "../article-rich-text";
import { educationPath } from "@/lib/routes";
import { getPublishedArticle } from "@/lib/server/education";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { RequestError } from "@/lib/server/http";
import "../education.css";

export const metadata: Metadata = { title: "Panduan tanaman · VEKTOR" };

export default async function EducationArticlePage({ params }: PageProps<"/edukasi/[slug]">) {
  await connection();
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof getPublishedArticle>>;
  try { article = await getPublishedArticle(slug); }
  catch (error) { if (error instanceof RequestError && error.status === 404) notFound(); throw error; }
  const account = await getAccount(await headers()).catch(() => null);
  await recordPageView(account, `${educationPath}/${slug}`);

  return <main className="education-page education-article-page">
    <header className="education-header"><Link href={educationPath} className="education-back">VEKTOR <span>·</span> Edukasi</Link><Link className="secondary" href="/masuk">Masuk</Link></header>
    <article className="education-article">
      <Link className="education-crumb" href={educationPath}>← Semua panduan</Link>
      <span className="education-category">{article.category}</span>
      <h1>{article.title}</h1>
      <p className="education-summary">{article.summary}</p>
      <p className="education-byline">Disusun oleh {article.author}{article.publishedAt ? ` · ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(article.publishedAt))}` : ""}</p>
      <div className="education-rich-text"><ArticleRichText content={article.content} /></div>
      <aside className="education-disclaimer"><strong>Catatan lapangan</strong><p>Kenali kondisi tanaman secara langsung dan konsultasikan temuan dengan penyuluh setempat. Panduan ini tidak menggantikan diagnosis atau rekomendasi perlakuan di lapangan.</p></aside>
    </article>
    <footer className="education-footer"><Link href={educationPath}>Jelajahi panduan lain</Link><Link href="/">Kembali ke beranda</Link></footer>
  </main>;
}
