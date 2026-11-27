import Link from "next/link";
import { connection } from "next/server";
import { BookOpen, Search } from "lucide-react";
import { headers } from "next/headers";
import { listPublishedArticles } from "@/lib/server/education";
import { educationPath } from "@/lib/routes";
import { getAccount } from "@/lib/server/auth";
import { recordPageView } from "@/lib/server/activity-log";
import { tw } from "@/lib/tw";

export async function EducationContent({ searchParams }: Pick<PageProps<"/edukasi">, "searchParams">) {
  await connection();
  const account = await getAccount(await headers()).catch(() => null);
  await recordPageView(account, educationPath);
  const query = await searchParams;
  const params = new URLSearchParams();
  const search = typeof query.q === "string" ? query.q : "";
  const category = typeof query.category === "string" ? query.category : "";
  const currentPage =
    typeof query.page === "string" && Number.isSafeInteger(Number(query.page)) ? Number(query.page) : 0;
  if (search) params.set("q", search);
  if (category) params.set("category", category);
  if (currentPage > 0) params.set("page", String(currentPage));
  const { entries, hasMore } = await listPublishedArticles(params);
  const nextParams = new URLSearchParams(params);
  nextParams.set("page", String(currentPage + 1));
  const previousParams = new URLSearchParams(params);
  if (currentPage <= 1) previousParams.delete("page");
  else previousParams.set("page", String(currentPage - 1));

  return (
    <main className={tw("mx-auto flex min-h-screen w-[min(calc(100%_-_2_*_clamp(16px,_5vw,_70px)),1080px)] flex-col")}>
      <header className={tw("flex min-h-[78px] items-center justify-between gap-3 border-b border-line")}>
        <Link href="/" className={tw("font-[720] tracking-[.025em] text-forest")}>
          VEKTOR <span className={tw("mx-1 text-[#83937e]")}>·</span> Karawang
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
      <section className={tw("max-w-[730px] pt-[clamp(42px,_8vw,_84px)] pb-[clamp(28px,_5vw,_50px)]")}>
        <span className={tw("inline-flex items-center gap-[7px] text-[.85rem] font-[680] text-[#466947]")}>
          <BookOpen size={16} /> Pusat belajar
        </span>
        <h1 className={tw("mt-[13px] max-w-[16ch] text-[clamp(2.2rem,_5vw,_4.2rem)] text-forest")}>
          Kenali gejala, pilih langkah yang tepat
        </h1>
        <p className={tw("mt-[13px] max-w-[62ch] leading-[1.65] text-muted")}>
          Panduan ringkas untuk membantu pengamatan di lahan. Informasi ini mendukung diskusi dengan penyuluh, bukan
          menggantikan pemeriksaan langsung.
        </p>
      </section>
      <form
        className={tw(
          "mb-[30px] grid max-w-[680px] grid-cols-[minmax(0,_1fr)_auto] items-end gap-x-[11px] gap-y-2 max-[620px]:grid-cols-1",
        )}
        action={educationPath}
      >
        <label className={tw("col-span-full text-[.84rem] font-[650]")} htmlFor="education-search">
          Cari panduan <span className={tw("font-[450] text-muted")}>(opsional)</span>
        </label>
        <div className={tw("relative")}>
          <Search className={tw("absolute top-[13px] left-3 text-muted")} size={18} aria-hidden="true" />
          <input
            className={tw(
              "min-h-[46px] w-full rounded-[7px] border border-[#cbd5c8] bg-surface py-[9px] pr-3 pl-[39px] text-[.9rem] text-ink placeholder:text-[#59675d]",
            )}
            id="education-search"
            name="q"
            type="search"
            placeholder="Contoh: wereng, blas, pengamatan"
            defaultValue={search}
          />
        </div>
        <button
          className={tw(
            "inline-flex min-h-[42px] w-fit items-center gap-2 justify-self-end rounded-[7px] border border-transparent bg-forest px-[13px] py-[9px] text-[.87rem] leading-[1.25] font-[640] text-white hover:bg-[#24523c]",
          )}
        >
          Cari
        </button>
      </form>
      {entries.length ? (
        <div className={tw("grid grid-cols-2 gap-[14px] max-[620px]:grid-cols-1")}>
          {entries.map((article) => (
            <article
              className={tw(
                "flex min-h-[218px] flex-col rounded-[11px] border border-line bg-surface p-[clamp(17px,_3vw,_25px)]",
              )}
              key={article.id}
            >
              <span
                className={tw(
                  "w-fit self-start rounded-full bg-[#e7eee0] px-[9px] py-[5px] text-[.76rem] font-[680] text-[#3e6241]",
                )}
              >
                {article.category}
              </span>
              <h2 className={tw("mt-[14px] text-[1.26rem]")}>
                <Link className={tw("text-forest")} href={`${educationPath}/${article.slug}`}>
                  {article.title}
                </Link>
              </h2>
              <p className={tw("mt-2 text-[.91rem] leading-[1.55] text-muted")}>{article.summary}</p>
              <footer className={tw("mt-auto flex justify-between gap-3 pt-[22px] text-[.79rem] text-muted")}>
                <span>{article.author}</span>
                <Link className={tw("font-[660] text-forest")} href={`${educationPath}/${article.slug}`}>
                  Baca panduan <span aria-hidden="true">→</span>
                </Link>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <section className={tw("rounded-[10px] border border-line bg-surface p-7")}>
          <h2>Belum ada panduan yang cocok</h2>
          <p className={tw("mt-[7px] text-muted")}>
            Coba kata kunci lain atau kembali lagi saat panduan baru tersedia.
          </p>
        </section>
      )}
      {(currentPage > 0 || hasMore) && (
        <nav className={tw("flex justify-center gap-2 py-[25px]")} aria-label="Halaman panduan">
          {currentPage > 0 && (
            <Link
              className={tw(
                "inline-flex min-h-[42px] w-fit items-center justify-center gap-2 rounded-[7px] border border-line bg-surface px-[13px] py-[9px] text-[.87rem] leading-[1.25] font-[640] text-forest hover:bg-[#edf2e7]",
              )}
              href={`${educationPath}?${previousParams}`}
            >
              Artikel sebelumnya
            </Link>
          )}
          {hasMore && (
            <Link
              className={tw(
                "inline-flex min-h-[42px] w-fit items-center justify-center gap-2 rounded-[7px] border border-line bg-surface px-[13px] py-[9px] text-[.87rem] leading-[1.25] font-[640] text-forest hover:bg-[#edf2e7]",
              )}
              href={`${educationPath}?${nextParams}`}
            >
              Artikel berikutnya
            </Link>
          )}
        </nav>
      )}
      <footer
        className={tw(
          "mt-auto flex flex-wrap justify-between gap-[10px] py-[25px] text-[.82rem] text-muted [&_a]:font-[660] [&_a]:text-forest",
        )}
      >
        <Link href="/">Kembali ke beranda</Link>
        <span>VEKTOR · Pemantauan padi Karawang</span>
      </footer>
    </main>
  );
}
