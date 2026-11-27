import Link from "next/link";
import { connection } from "next/server";
import { BookOpen, Search } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { listPublishedArticles } from "@/lib/server/education";
import { educationPath } from "@/lib/routes";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import "./education.css";

export const metadata: Metadata = { title: "Edukasi tanaman · VEKTOR" };

export default async function EducationPage({ searchParams }: PageProps<"/edukasi">) {
  await connection();
  const account = await getAccount(await headers()).catch(() => null);
  await recordPageView(account, educationPath);
  const query = await searchParams;
  const params = new URLSearchParams();
  const search = typeof query.q === "string" ? query.q : "";
  const category = typeof query.category === "string" ? query.category : "";
  const currentPage = typeof query.page === "string" && Number.isSafeInteger(Number(query.page)) ? Number(query.page) : 0;
  if (search) params.set("q", search);
  if (category) params.set("category", category);
  if (currentPage > 0) params.set("page", String(currentPage));
  const { entries, hasMore } = await listPublishedArticles(params);
  const nextParams = new URLSearchParams(params);
  nextParams.set("page", String(currentPage + 1));
  const previousParams = new URLSearchParams(params);
  if (currentPage <= 1) previousParams.delete("page");
  else previousParams.set("page", String(currentPage - 1));

  return <main className="education-page">
    <header className="education-header">
      <Link href="/" className="education-back">VEKTOR <span>·</span> Karawang</Link>
      <Link className="secondary" href="/masuk">Masuk</Link>
    </header>
    <section className="education-intro">
      <span className="education-kicker"><BookOpen size={16} /> Pusat belajar</span>
      <h1>Kenali gejala, pilih langkah yang tepat</h1>
      <p>Panduan ringkas untuk membantu pengamatan di lahan. Informasi ini mendukung diskusi dengan penyuluh, bukan menggantikan pemeriksaan langsung.</p>
    </section>
    <form className="education-search" action={educationPath}>
      <label htmlFor="education-search">Cari panduan <span>(opsional)</span></label>
      <div><Search size={18} aria-hidden="true" /><input id="education-search" name="q" type="search" placeholder="Contoh: wereng, blas, pengamatan" defaultValue={search} /></div>
      <button className="primary">Cari</button>
    </form>
    {entries.length ? <div className="education-grid">
      {entries.map((article) => <article className="education-card" key={article.id}>
        <span className="education-category">{article.category}</span>
        <h2><Link href={`${educationPath}/${article.slug}`}>{article.title}</Link></h2>
        <p>{article.summary}</p>
        <footer><span>{article.author}</span><Link href={`${educationPath}/${article.slug}`}>Baca panduan <span aria-hidden="true">→</span></Link></footer>
      </article>)}
    </div> : <section className="education-empty"><h2>Belum ada panduan yang cocok</h2><p>Coba kata kunci lain atau kembali lagi saat panduan baru tersedia.</p></section>}
    {(currentPage > 0 || hasMore) && <nav className="education-pagination" aria-label="Halaman panduan">
      {currentPage > 0 && <Link className="secondary" href={`${educationPath}?${previousParams}`}>Artikel sebelumnya</Link>}
      {hasMore && <Link className="secondary" href={`${educationPath}?${nextParams}`}>Artikel berikutnya</Link>}
    </nav>}
    <footer className="education-footer"><Link href="/">Kembali ke beranda</Link><span>VEKTOR · Pemantauan padi Karawang</span></footer>
  </main>;
}
