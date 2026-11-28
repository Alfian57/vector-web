import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Camera,
  ClipboardCheck,
  CloudOff,
  MapPin,
  Plus,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { educationPath, radarPath } from "@/lib/routes";
import { Brand } from "./_components/brand";
import { LandingHeader } from "./_components/landing-header";
import { LandingNavigation } from "./_components/landing-navigation";
import { tw } from "@/lib/tw";

const photoSource = "https://commons.wikimedia.org/wiki/File:Cikampek_Rice_field_in_west_Java,_Indonesia.jpg";
const harvestSource =
  "https://jabar.bps.go.id/id/statistics-table/3/WmpaNk1YbGFjR0pOUjBKYWFIQlBSU3MwVHpOVWR6MDkjMw%3D%3D/harvested-area--yield--and-production-of-paddy-by-regency-municipality-in-jawa-barat-province--2024.html?year=2025";
const fieldReportSource =
  "https://bbpopt.tanamanpangan.pertanian.go.id/berita/tanggap-opt%2C-kementan-bergerak-cepat%2C-bbpopt-lakukan-bimbingan-teknis-dan-gerakan-pengendalian-di-sentra-beras-karawang";
const primaryActionClassName =
  "inline-flex min-h-[42px] w-fit shrink-0 items-center justify-center gap-2 rounded-[7px] border border-transparent bg-accent px-4 py-3 text-[.87rem] leading-[1.25] font-[640] text-forest hover:bg-[#e9f8bc]";

const features = [
  {
    icon: MapPin,
    title: "Radar per kecamatan",
    description:
      "Saring peta berdasarkan jenis temuan dan lihat kecamatan dengan beberapa laporan terverifikasi yang berdekatan.",
  },
  {
    icon: CloudOff,
    title: "Laporan dan peta offline",
    description:
      "Unduh peta sebelum berangkat. Foto, lokasi, dan catatan tetap bisa disimpan ketika perangkat kehilangan koneksi.",
  },
  {
    icon: Bell,
    title: "Peringatan untuk petak pantauan",
    description:
      "Daftarkan petak untuk menerima peringatan kecamatan di kotak masuk. Gunakan data cuaca sebagai konteks pemantauan.",
  },
];

const steps = [
  {
    icon: CloudOff,
    title: "Siapkan sebelum ke lahan",
    description: "Masuk saat masih terhubung, buka radar, lalu pilih Siapkan offline untuk menyimpan peta Karawang.",
  },
  {
    icon: Camera,
    title: "Catat temuan di lahan",
    description:
      "Ambil foto daun, tandai lokasi, dan simpan laporan. VEKTOR mengirim laporan saat perangkat terhubung kembali.",
  },
  {
    icon: ClipboardCheck,
    title: "Lihat hasil peninjauan",
    description:
      "Petugas penyuluh lapangan (PPL) memeriksa laporan. Ikuti statusnya di Laporan dan lihat temuan terverifikasi pada radar.",
  },
];

const questions = [
  {
    question: "Apakah saya perlu membuat akun?",
    answer:
      "Masuk untuk membuka radar, mengirim laporan, menyimpan petak pantauan, dan membaca peringatan untuk petak Anda.",
  },
  {
    question: "Wilayah mana yang dicakup VEKTOR?",
    answer:
      "VEKTOR digunakan untuk pemantauan padi di Kabupaten Karawang, Jawa Barat. Peta dan ringkasan laporan disusun menurut kecamatan.",
  },
  {
    question: "Kapan laporan saya muncul di radar?",
    answer:
      "Radar memperbarui ringkasannya setelah petugas memverifikasi temuan. Laporan yang masih ditinjau dapat Anda lihat di menu Laporan.",
  },
  {
    question: "Apakah foto langsung menghasilkan diagnosis?",
    answer:
      "Diagnosis otomatis masih dalam pengembangan. Anda dapat mencatat gejala yang terlihat, lalu petugas menilai laporan dan menetapkan hasil verifikasi.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-[1460px] px-[clamp(16px,5vw,70px)]">
      <LandingHeader />

      <main>
        <section
          className="grid grid-cols-1 overflow-hidden rounded-[14px] bg-forest min-[761px]:grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)]"
          aria-labelledby="landing-title"
        >
          <div className={tw("self-center p-[clamp(24px,_5vw,_67px)] text-[#f9fcf1]")}>
            <p className={tw("flex items-center gap-[6px] text-[.88rem] text-accent")}>
              <MapPin size={16} aria-hidden="true" /> Karawang, Jawa Barat
            </p>
            <h1
              className={tw(
                "mt-3 mb-[17px] max-w-[13ch] text-[clamp(2.35rem,_5vw,_4.65rem)] font-[720] tracking-[-.035em]",
              )}
              id="landing-title"
            >
              Pantau temuan padi dari lahan
            </h1>
            <p className={tw("max-w-[36ch] text-base leading-[1.6] text-[#d9e7d7]")}>
              Catat gejala tanaman meski tanpa sinyal. Lihat temuan yang sudah diverifikasi petugas penyuluh lapangan di
              radar Karawang.
            </p>
            <a className={tw(`${primaryActionClassName} mt-[23px]`)} href={radarPath}>
              Buka Radar <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <figure className="relative m-0 aspect-4/3 bg-[#52774c] min-[761px]:aspect-auto min-[761px]:min-h-[410px]">
            <Image
              src="/sawah-cikampek.webp"
              alt="Persawahan di Cikampek, Karawang"
              fill
              unoptimized
              preload
              sizes="(min-width: 1460px) 715px, (min-width: 761px) 50vw, 100vw"
              className={tw("object-cover")}
            />
            <figcaption
              className={tw(
                "absolute inset-auto right-3 bottom-3 rounded-[4px] bg-forest px-2 py-[5px] text-[.72rem] text-white [&_a]:underline [&_a]:underline-offset-[3px]",
              )}
            >
              <a href={photoSource} target="_blank" rel="noreferrer">
                Cikampek, Karawang · Foto Njc012
              </a>
            </figcaption>
          </figure>
        </section>

        <section
          id="tentang"
          className={tw(
            "my-[clamp(46px,_7vw,_96px)] grid scroll-mt-[22px] grid-cols-1 items-start gap-[clamp(12px,_4vw,_54px)] border-y border-line py-[clamp(23px,_4vw,_50px)] min-[761px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]",
          )}
          aria-labelledby="story-heading"
        >
          <div>
            <h2 className={tw("max-w-[16ch] text-[clamp(1.82rem,_3.75vw,_3.25rem)] text-forest")} id="story-heading">
              Saat satu rumpun padi mulai berubah
            </h2>
            <p className={tw("mt-4 max-w-[45ch] leading-[1.58] text-muted")}>
              <strong>VEKTOR</strong> (<span lang="en">Vegetation Epidemic &amp; Crop Threat Observation Radar</span>)
              adalah radar hama dan penyakit tanaman yang menampilkan temuan dari laporan petani setelah diperiksa
              penyuluh. Uji coba saat ini berfokus pada padi di Kabupaten Karawang.
            </p>
            <p
              className={tw("mt-4 max-w-[45ch] leading-[1.58] text-muted [&_strong]:font-[680] [&_strong]:text-forest")}
            >
              Sepanjang 2025, luas panen padi di Karawang mencapai <strong>202.293 hektare</strong> dengan produksi{" "}
              <strong>1.194.712 ton gabah kering giling</strong>.
            </p>
            <p className={tw("mt-[5px] leading-[1.58] text-muted")}>
              <a
                className={tw("text-[.83rem] text-forest underline underline-offset-[3px]")}
                href={harvestSource}
                target="_blank"
                rel="noreferrer"
              >
                Data panen 2025 dari BPS Jawa Barat
              </a>
            </p>
          </div>
          <div className={tw("max-w-[61ch] leading-[1.58] text-muted [&_p+p]:mt-3")}>
            <p>
              Anda melihat bercak baru pada daun padi dan ingin tahu apakah petak lain menunjukkan gejala serupa. Di
              tengah sawah, sinyal yang terputus bisa membuat foto dan catatan itu menunggu sampai Anda pulang.
            </p>
            <p>
              Memastikan kondisi di sawah butuh pemeriksaan langsung. Pada Juni 2024, Kementerian Pertanian dan Dinas
              Pertanian Karawang turun ke lapangan untuk memeriksa kabar serangan hama padi.{" "}
              <a
                className={tw("text-[.83rem] text-forest underline underline-offset-[3px]")}
                href={fieldReportSource}
                target="_blank"
                rel="noreferrer"
              >
                Catatan BBPOPT
              </a>
            </p>
            <p>
              VEKTOR membantu proses itu dimulai di petak. Foto, lokasi, dan waktu pengamatan tersimpan hingga koneksi
              kembali. Penyuluh bisa memakai catatan itu untuk meninjau laporan, dan petani bisa melihat ringkasan
              temuan terverifikasi di radar.
            </p>
            <a
              className={tw(
                "mt-[14px] inline-flex w-fit items-center gap-1 font-[630] text-[#2c6040] underline underline-offset-[3px]",
              )}
              href="#fitur"
            >
              Kenali fitur VEKTOR
            </a>
          </div>
        </section>

        <section
          id="fitur"
          className={tw("my-[clamp(46px,_7vw,_96px)] scroll-mt-[22px]")}
          aria-labelledby="features-heading"
        >
          <header className={tw("mb-[clamp(16px,_3vw,_28px)]")}>
            <h2 className={tw("text-[clamp(1.82rem,_3.75vw,_3.25rem)]")} id="features-heading">
              Lihat kondisi padi di wilayah Anda
            </h2>
            <p className={tw("mt-[9px] max-w-[59ch] leading-[1.58] text-muted")}>
              Gabungkan catatan dari lahan, hasil verifikasi, dan informasi wilayah untuk menentukan apa yang perlu
              diperiksa.
            </p>
          </header>
          <div
            className={tw(
              "grid grid-cols-1 items-start gap-[clamp(14px,_3vw,_38px)] min-[761px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]",
            )}
          >
            <figure className={tw("m-0 overflow-hidden rounded-[11px] border border-line bg-surface")}>
              <Image
                src="/pratinjau-radar-karawang.webp"
                alt="Pratinjau peta Karawang dengan garis batas kecamatan"
                width={698}
                height={469}
                unoptimized
                className={tw("h-auto w-full bg-[#e2e8d4]")}
              />
              <figcaption
                className={tw(
                  "flex flex-wrap justify-between gap-x-[15px] gap-y-[6px] px-[13px] py-[10px] text-[.78rem] text-muted [&_a]:underline [&_a]:underline-offset-[3px]",
                )}
              >
                <span>Peta kecamatan Karawang</span>
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  © OpenStreetMap
                </a>
              </figcaption>
            </figure>
            <ul className={tw("m-0 list-none border-b border-line p-0")} role="list">
              {features.map(({ icon: Icon, title, description }) => (
                <li
                  className={tw(
                    "grid grid-cols-[auto_minmax(0,_1fr)] gap-[13px] border-t border-line py-[clamp(12px,_2vw,_22px)]",
                  )}
                  key={title}
                >
                  <span className={tw("grid size-10 place-items-center rounded-lg bg-[#e7eee0] text-forest")}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className={tw("text-[clamp(1.08rem,_1.55vw,_1.3rem)]")}>{title}</h3>
                    <p className={tw("mt-[6px] text-[.94rem] leading-[1.58] text-muted")}>{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="cara-kerja"
          className={tw(
            "my-[clamp(46px,_7vw,_96px)] scroll-mt-[22px] rounded-xl border border-line bg-surface p-[clamp(17px,_4vw,_48px)]",
          )}
          aria-labelledby="process-heading"
        >
          <header className={tw("mb-[clamp(16px,_3vw,_28px)]")}>
            <h2 className={tw("text-[clamp(1.82rem,_3.75vw,_3.25rem)]")} id="process-heading">
              Cara kerja VEKTOR
            </h2>
          </header>
          <ol
            className="m-0 grid list-none grid-cols-1 gap-[clamp(14px,3vw,34px)] p-0 min-[761px]:grid-cols-3"
            role="list"
          >
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li className={tw("border-t-2 border-[#aebfa4] pt-3")} key={title}>
                <div className={tw("mb-[15px] flex items-center justify-between text-forest")}>
                  <span
                    className={tw(
                      "grid size-[30px] place-items-center rounded-full bg-[#e7eee0] text-[.88rem] font-[680]",
                    )}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <Icon size={25} aria-hidden="true" />
                </div>
                <h3 className={tw("text-[clamp(1.08rem,_1.55vw,_1.3rem)]")}>{title}</h3>
                <p className={tw("mt-[6px] text-[.94rem] leading-[1.58] text-muted")}>{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={tw("my-[clamp(46px,_7vw,_96px)] scroll-mt-[22px]")} aria-labelledby="roles-heading">
          <header className={tw("mb-[clamp(16px,_3vw,_28px)]")}>
            <h2 className={tw("text-[clamp(1.82rem,_3.75vw,_3.25rem)]")} id="roles-heading">
              Dirancang untuk kerja bersama
            </h2>
          </header>
          <div className="grid grid-cols-1 divide-y divide-[#c8d6c0] overflow-hidden rounded-xl border border-[#d4dfcd] bg-[#e6eee1] min-[761px]:grid-cols-3 min-[761px]:divide-x min-[761px]:divide-y-0 [&>article]:p-[clamp(17px,3vw,32px)]">
            <article>
              <Sprout className={tw("mb-3 text-forest")} size={25} aria-hidden="true" />
              <h3 className={tw("text-[clamp(1.08rem,_1.55vw,_1.3rem)]")}>Petani dan pengamat lapangan</h3>
              <p className={tw("mt-[6px] text-[.94rem] leading-[1.58] text-muted")}>
                Simpan catatan kondisi padi, cek status laporan, dan pantau peringatan untuk kecamatan tempat petak Anda
                berada.
              </p>
            </article>
            <article>
              <ShieldCheck className={tw("mb-3 text-forest")} size={25} aria-hidden="true" />
              <h3 className={tw("text-[clamp(1.08rem,_1.55vw,_1.3rem)]")}>Petugas penyuluh lapangan (PPL)</h3>
              <p className={tw("mt-[6px] text-[.94rem] leading-[1.58] text-muted")}>
                Periksa foto dan lokasi laporan, catat tindak lanjut, dan kirim siaran kepada petani di kecamatan
                terkait.
              </p>
            </article>
            <article>
              <ClipboardCheck className={tw("mb-3 text-forest")} size={25} aria-hidden="true" />
              <h3 className={tw("text-[clamp(1.08rem,_1.55vw,_1.3rem)]")}>Pengelola VEKTOR</h3>
              <p className={tw("mt-[6px] text-[.94rem] leading-[1.58] text-muted")}>
                Jaga akses akun, terbitkan panduan edukasi, dan tinjau catatan operasional agar informasi tetap
                terkelola.
              </p>
            </article>
          </div>
        </section>

        <section
          id="faq"
          className={tw(
            "my-[clamp(46px,_7vw,_96px)] grid scroll-mt-[22px] grid-cols-1 items-start gap-x-8 gap-y-[10px] min-[761px]:grid-cols-[minmax(0,0.77fr)_minmax(0,1.23fr)]",
          )}
          aria-labelledby="faq-heading"
        >
          <header>
            <h2 className={tw("text-[clamp(1.82rem,_3.75vw,_3.25rem)]")} id="faq-heading">
              Pertanyaan umum
            </h2>
          </header>
          <div className={tw("border-b border-line")}>
            {questions.map(({ question, answer }) => (
              <details className={tw("group border-t border-line")} key={question}>
                <summary
                  className={tw(
                    "flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-[650] text-forest [&::-webkit-details-marker]:hidden",
                  )}
                >
                  {question}
                  <Plus
                    className="shrink-0 group-open:rotate-45 motion-safe:transition-transform"
                    size={19}
                    aria-hidden="true"
                  />
                </summary>
                <p className={tw("max-w-[63ch] pb-[15px] leading-[1.58] text-muted")}>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className={tw(
            "flex flex-wrap items-center justify-between gap-[17px] rounded-xl bg-forest p-[clamp(19px,_4vw,_45px)] text-[#f9fcf1]",
          )}
          aria-labelledby="cta-heading"
        >
          <div>
            <h2 className={tw("text-[clamp(1.82rem,_3.75vw,_3.25rem)]")} id="cta-heading">
              Mulai dari radar Karawang
            </h2>
            <p className={tw("mt-[7px] text-[#d9e7d7]")}>
              Cari kecamatan Anda dan lihat temuan terverifikasi di sekitarnya.
            </p>
          </div>
          <div className="flex max-w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <a className={tw(primaryActionClassName)} href={radarPath}>
              Buka Radar <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link
              className={tw(
                "inline-flex items-center gap-[7px] text-[.88rem] font-[620] text-[#e3eedc] hover:underline hover:underline-offset-4",
              )}
              href={educationPath}
            >
              <BookOpen size={17} aria-hidden="true" /> Baca panduan
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={tw(
          "mt-[clamp(24px,_4vw,_42px)] flex flex-wrap items-center justify-between gap-[13px] border-t border-line py-[19px]",
        )}
      >
        <Brand />
        <LandingNavigation label="Navigasi kaki halaman" />
      </footer>
    </div>
  );
}
