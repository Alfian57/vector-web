import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, BookOpen, Camera, ClipboardCheck, CloudOff, MapPin, Plus, ShieldCheck, Sprout } from "lucide-react";
import { educationPath, radarPath } from "@/lib/routes";
import { Brand } from "./_components/brand";
import "./landing.css";

const photoSource = "https://commons.wikimedia.org/wiki/File:Cikampek_Rice_field_in_west_Java,_Indonesia.jpg";
const harvestSource = "https://jabar.bps.go.id/id/statistics-table/3/WmpaNk1YbGFjR0pOUjBKYWFIQlBSU3MwVHpOVWR6MDkjMw%3D%3D/harvested-area--yield--and-production-of-paddy-by-regency-municipality-in-jawa-barat-province--2024.html?year=2025";
const fieldReportSource = "https://bbpopt.tanamanpangan.pertanian.go.id/berita/tanggap-opt%2C-kementan-bergerak-cepat%2C-bbpopt-lakukan-bimbingan-teknis-dan-gerakan-pengendalian-di-sentra-beras-karawang";

const sectionLinks = [
  { href: "#tentang", label: "Tentang" },
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#faq", label: "Tanya jawab" },
  { href: educationPath, label: "Edukasi" },
] as const;

const features = [
  { icon: MapPin, title: "Radar per kecamatan", description: "Saring peta berdasarkan jenis temuan dan lihat kecamatan dengan beberapa laporan terverifikasi yang berdekatan." },
  { icon: CloudOff, title: "Laporan dan peta offline", description: "Unduh peta sebelum berangkat. Foto, lokasi, dan catatan tetap bisa disimpan ketika perangkat kehilangan koneksi." },
  { icon: Bell, title: "Peringatan untuk petak pantauan", description: "Daftarkan petak untuk menerima peringatan kecamatan di kotak masuk. Gunakan data cuaca sebagai konteks pemantauan." },
];

const steps = [
  { icon: CloudOff, title: "Siapkan sebelum ke lahan", description: "Masuk saat masih terhubung, buka radar, lalu pilih Siapkan offline untuk menyimpan peta Karawang." },
  { icon: Camera, title: "Catat temuan di lahan", description: "Ambil foto daun, tandai lokasi, dan simpan laporan. VEKTOR mengirim laporan saat perangkat terhubung kembali." },
  { icon: ClipboardCheck, title: "Lihat hasil peninjauan", description: "Petugas penyuluh lapangan (PPL) memeriksa laporan. Ikuti statusnya di Laporan dan lihat temuan terverifikasi pada radar." },
];

const questions = [
  { question: "Apakah saya perlu membuat akun?", answer: "Masuk untuk membuka radar, mengirim laporan, menyimpan petak pantauan, dan membaca peringatan untuk petak Anda." },
  { question: "Wilayah mana yang dicakup VEKTOR?", answer: "VEKTOR digunakan untuk pemantauan padi di Kabupaten Karawang, Jawa Barat. Peta dan ringkasan laporan disusun menurut kecamatan." },
  { question: "Kapan laporan saya muncul di radar?", answer: "Radar memperbarui ringkasannya setelah petugas memverifikasi temuan. Laporan yang masih ditinjau dapat Anda lihat di menu Laporan." },
  { question: "Apakah foto langsung menghasilkan diagnosis?", answer: "Diagnosis otomatis masih dalam pengembangan. Anda dapat mencatat gejala yang terlihat, lalu petugas menilai laporan dan menetapkan hasil verifikasi." },
];

export default function Home() {
  return <div className="landing">
    <header className="landing-nav">
      <Brand />
      <nav className="landing-menu" aria-label="Navigasi beranda">
        {sectionLinks.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <Link className="secondary landing-sign-in" href="/masuk">Masuk</Link>
    </header>

    <main>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-intro">
          <p className="landing-region"><MapPin size={16} aria-hidden="true" /> Karawang, Jawa Barat</p>
          <h1 id="landing-title">Pantau temuan padi dari lahan</h1>
          <p>Catat gejala tanaman meski tanpa sinyal. Lihat temuan yang sudah diverifikasi petugas penyuluh lapangan di radar Karawang.</p>
          <Link className="primary" href={radarPath} prefetch={false}>Buka Radar <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <figure className="landing-photo">
          <Image src="/sawah-cikampek.webp" alt="Persawahan di Cikampek, Karawang" fill unoptimized preload sizes="(max-width: 760px) 100vw, 55vw" />
          <figcaption><a href={photoSource} target="_blank" rel="noreferrer">Cikampek, Karawang · Foto Njc012</a></figcaption>
        </figure>
      </section>

      <section id="tentang" className="landing-section landing-story" aria-labelledby="story-heading">
        <div>
          <h2 id="story-heading">Saat satu rumpun padi mulai berubah</h2>
          <p className="landing-story-definition"><strong>VEKTOR</strong> (<span lang="en">Vegetation Epidemic &amp; Crop Threat Observation Radar</span>) adalah radar hama dan penyakit tanaman yang menampilkan temuan dari laporan petani setelah diperiksa penyuluh. Uji coba saat ini berfokus pada padi di Kabupaten Karawang.</p>
          <p className="landing-story-fact">Sepanjang 2025, luas panen padi di Karawang mencapai <strong>202.293 hektare</strong> dengan produksi <strong>1.194.712 ton gabah kering giling</strong>.</p>
          <p className="landing-story-citation">
            <a className="landing-story-source" href={harvestSource} target="_blank" rel="noreferrer">Data panen 2025 dari BPS Jawa Barat</a>
          </p>
        </div>
        <div className="landing-story-copy">
          <p>Anda melihat bercak baru pada daun padi dan ingin tahu apakah petak lain menunjukkan gejala serupa. Di tengah sawah, sinyal yang terputus bisa membuat foto dan catatan itu menunggu sampai Anda pulang.</p>
          <p>Memastikan kondisi di sawah butuh pemeriksaan langsung. Pada Juni 2024, Kementerian Pertanian dan Dinas Pertanian Karawang turun ke lapangan untuk memeriksa kabar serangan hama padi. <a className="landing-story-source" href={fieldReportSource} target="_blank" rel="noreferrer">Catatan BBPOPT</a></p>
          <p>VEKTOR membantu proses itu dimulai di petak. Foto, lokasi, dan waktu pengamatan tersimpan hingga koneksi kembali. Penyuluh bisa memakai catatan itu untuk meninjau laporan, dan petani bisa melihat ringkasan temuan terverifikasi di radar.</p>
          <a className="text-link" href="#fitur">Kenali fitur VEKTOR</a>
        </div>
      </section>

      <section id="fitur" className="landing-section" aria-labelledby="features-heading">
        <header className="landing-section-heading">
          <h2 id="features-heading">Lihat kondisi padi di wilayah Anda</h2>
          <p>Gabungkan catatan dari lahan, hasil verifikasi, dan informasi wilayah untuk menentukan apa yang perlu diperiksa.</p>
        </header>
        <div className="landing-features">
          <figure className="landing-map-preview">
            <Image src="/pratinjau-radar-karawang.webp" alt="Pratinjau peta Karawang dengan garis batas kecamatan" width={698} height={469} unoptimized />
            <figcaption><span>Peta kecamatan Karawang</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></figcaption>
          </figure>
          <ul className="landing-feature-list" role="list">
            {features.map(({ icon: Icon, title, description }) => <li key={title}>
              <span className="landing-feature-icon"><Icon size={21} aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </li>)}
          </ul>
        </div>
      </section>

      <section id="cara-kerja" className="landing-section landing-process" aria-labelledby="process-heading">
        <header className="landing-section-heading">
          <h2 id="process-heading">Cara kerja VEKTOR</h2>
        </header>
        <ol className="landing-steps" role="list">
          {steps.map(({ icon: Icon, title, description }, index) => <li key={title}>
            <div className="landing-step-marker">
              <span aria-hidden="true">{index + 1}</span>
              <Icon size={25} aria-hidden="true" />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>)}
        </ol>
      </section>

      <section className="landing-section" aria-labelledby="roles-heading">
        <header className="landing-section-heading">
          <h2 id="roles-heading">Dirancang untuk kerja bersama</h2>
        </header>
        <div className="landing-roles">
          <article>
            <Sprout size={25} aria-hidden="true" />
            <h3>Petani dan pengamat lapangan</h3>
            <p>Simpan catatan kondisi padi, cek status laporan, dan pantau peringatan untuk kecamatan tempat petak Anda berada.</p>
          </article>
          <article>
            <ShieldCheck size={25} aria-hidden="true" />
            <h3>Petugas penyuluh lapangan (PPL)</h3>
            <p>Periksa foto dan lokasi laporan, catat tindak lanjut, dan kirim siaran kepada petani di kecamatan terkait.</p>
          </article>
          <article>
            <ClipboardCheck size={25} aria-hidden="true" />
            <h3>Pengelola VEKTOR</h3>
            <p>Jaga akses akun, terbitkan panduan edukasi, dan tinjau catatan operasional agar informasi tetap terkelola.</p>
          </article>
        </div>
      </section>

      <section id="faq" className="landing-section landing-faq" aria-labelledby="faq-heading">
        <header className="landing-section-heading">
          <h2 id="faq-heading">Pertanyaan umum</h2>
        </header>
        <div className="landing-questions">
          {questions.map(({ question, answer }) => <details key={question}>
            <summary>{question}<Plus size={19} aria-hidden="true" /></summary>
            <p>{answer}</p>
          </details>)}
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="cta-heading">
        <div><h2 id="cta-heading">Mulai dari radar Karawang</h2><p>Cari kecamatan Anda dan lihat temuan terverifikasi di sekitarnya.</p></div>
        <div className="landing-action-row"><Link className="primary" href={radarPath} prefetch={false}>Buka Radar <ArrowRight size={18} aria-hidden="true" /></Link><Link className="landing-education-link" href={educationPath}><BookOpen size={17} aria-hidden="true" /> Baca panduan</Link></div>
      </section>
    </main>

    <footer className="landing-footer">
      <Brand />
      <nav className="landing-menu" aria-label="Navigasi kaki halaman">
        {sectionLinks.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
      </nav>
    </footer>
  </div>;
}
