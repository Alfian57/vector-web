# VEKTOR

VEKTOR menerima laporan temuan padi di Karawang, termasuk saat perangkat kehilangan koneksi. Petugas penyuluh lapangan (PPL) memverifikasi laporan dan memantau klaster teramati pada radar. Pemindaian foto memakai placeholder. Petani memasukkan dugaan dan catatan gejala secara manual.

## Pengembangan lokal dengan Bun dan Docker

Gunakan Bun sesuai `package.json` dan Node.js 24.11 atau lebih baru pada seri 24 untuk Prisma 7. Jalankan perintah berikut dari root repository.

1. Salin `.env.example` ke `.env`. Isi kata sandi PostgreSQL dan rahasia Better Auth dengan nilai acak. Samakan kata sandi pada `POSTGRES_PASSWORD` dan `DATABASE_URL`.
2. Salin `.env` ke `.env.local` dan ubah host database menjadi `127.0.0.1:5433`. Bun dan Next.js memakai nilai host itu saat berjalan di luar Docker.
3. Jalankan `bun install --frozen-lockfile` untuk memasang dependensi dan membuat Prisma Client.
4. Isi `FONNTE_TOKEN` dengan token perangkat WhatsApp yang terhubung di Fonnte. Simpan di `.env.local` untuk Next.js di host atau `.env` untuk aplikasi di Docker. Lihat [cara mendapatkan token perangkat](https://docs.fonnte.com/token-api-key/).
5. Jalankan `bun run dev:all`. Perintah ini menyalakan PostGIS melalui Docker, menerapkan migrasi Prisma, lalu menjalankan Next.js dengan hot reload dan worker dalam satu terminal.
6. Buka `http://localhost:3000/masuk`. Daftar sebagai petani dengan nomor WhatsApp dan kode yang diterima. Untuk mengaktifkan akses PPL, jalankan `bun --env-file=.env.local run officer:grant +6281234567890` dengan nomor yang sudah terverifikasi, lalu masuk kembali.

Jalankan `bun run push:setup` untuk mengisi konfigurasi Web Push di `.env.local`, lalu mulai ulang Next.js dan worker. Perintah ini mempertahankan pasangan kunci yang sudah ada.

Di mode development, PostGIS memakai kebijakan restart `no`: menyalakan Docker saja tidak otomatis menyalakan container database setelah laptop atau Docker dimatikan. `bun run dev:all` tetap menyalakannya saat diminta dan `Ctrl+C` menghentikan Next.js serta worker. Untuk menghentikan PostGIS sebelum selesai bekerja, jalankan `docker compose --env-file .env -p vektor-dev -f docker/compose.yaml -f docker/compose.dev.yaml stop db`. Data tetap tersimpan di volume Docker.

Uji reload offline dengan `bun run build` dan `bun run start`. Worker produksi menyimpan landing page dan aset dari build. Masuk lalu pilih **Siapkan offline** untuk menyimpan halaman radar dan peta pada perangkat. Ikon PWA membuka radar.

Untuk menjalankan seluruh aplikasi di Compose, gunakan `docker compose --env-file .env -f docker/compose.yaml up --build -d` dengan `.env` yang memakai host `db`. Compose menerapkan migrasi, mengisi akun dan konten demo, lalu menjalankan aplikasi dan worker. Seeder deployment membuat akun presentasi `admin@gmail.com`, `petani@gmail.com`, dan `petugas@gmail.com` dengan kata sandi `password`, serta mengatur ulang kata sandi demo itu setiap deployment. Nonaktifkan layanan seeder dan hapus akun demo sebelum membuka instance dengan data privat kepada pengguna. Jalankan `docker compose --env-file .env -f docker/compose.yaml exec app bun run officer:grant +6281234567890` untuk mengaktifkan akses PPL pada nomor yang sudah terverifikasi.

### Akun dan WhatsApp

Pendaftaran dan **Lupa kata sandi** menggunakan kode enam digit yang dikirim lewat WhatsApp. Kode berlaku lima menit. Permintaan kode ke nomor yang sama dibatasi sekali per menit untuk tiap alur. Masuk dengan nomor WhatsApp dan kata sandi. Nomor Indonesia bisa ditulis dengan awalan `08`, `62`, atau `+62`.

Akun lama yang sudah memverifikasi email, termasuk akun demo, tetap bisa masuk dengan email. Pilih **Hubungkan WhatsApp** pada radar atau dasbor PPL, lalu masukkan kode WhatsApp dan kata sandi saat ini. Nomor terverifikasi dapat dipakai untuk masuk dan memulihkan kata sandi. Perintah `officer:grant` juga masih menerima email akun lama yang sudah terverifikasi. Akun Admin demo dapat masuk dengan `admin@gmail.com`; Admin mengelola akun petani/PPL, artikel edukasi, ringkasan worker, dan log aktivitas di `/admin`.

### Migrasi Prisma

Schema berada di [prisma/schema.prisma](prisma/schema.prisma) dan histori SQL di [prisma/migrations](prisma/migrations). Prisma menangani akun dan operasi database aplikasi. Kueri spasial dan batas database tetap dikelola dengan SQL PostGIS.

Untuk database baru maupun database VEKTOR yang sudah berjalan, jalankan `bun --env-file=.env.local run db:migrate` di host atau gunakan layanan `migrate` dari Compose. Perintah ini menandai migrasi lama yang sudah tercatat, menerapkan migrasi yang tersisa, lalu memuat batas 30 kecamatan. Gunakan perintah ini saat beralih ke Prisma agar data lama dan riwayat migrasi tetap dipertahankan.

Setelah mengubah schema, jalankan `bun run db:generate` untuk memperbarui Prisma Client. Buat perubahan skema sebagai migrasi baru. Simpan perintah terkait PostGIS dan batas database di migrasi SQL.

### Data demo untuk presentasi

Setelah PostGIS lokal berjalan dan migrasi selesai, jalankan `bun run db:seed`. Seeder host hanya berjalan pada database pengembangan VEKTOR. Seeder Compose memakai flag deployment eksplisit dan hanya membuat data demo pada host database `db` dalam jaringan Compose. Seeder dapat dijalankan ulang tanpa menambah duplikat laporan, artikel, akun, atau log demo.

- Buka **Radar** untuk melihat dua klaster contoh, kondisi cuaca, dan tren empat minggu. Data laporan dan lokasi adalah ilustrasi presentasi.
- Masuk sebagai `petani@gmail.com` untuk membuka petak pantauan, laporan dan foto, serta kotak masuk dengan pesan yang sudah dibaca dan belum dibaca.
- Masuk sebagai `petugas@gmail.com`, lalu buka **Dasbor PPL** untuk meninjau antrean, riwayat koreksi verifikasi, tindak lanjut, dan bantuan dengan contoh alokasi penuh atau sebagian tersalurkan.
- Masuk sebagai `admin@gmail.com` untuk mengelola akun non-Admin, menerbitkan panduan di **Edukasi**, dan meninjau log. Artikel terbit dapat dibaca pengunjung di `/edukasi`; artikel draf hanya terlihat oleh Admin.

### Edukasi, Admin, dan audit

Editor edukasi memakai Tiptap 3 (MIT) untuk menyimpan konten terstruktur serta merendernya di server. LogTape 2 (MIT) menghasilkan log sistem JSON Lines dan catatan audit disimpan di PostgreSQL. Gambar JPEG, PNG, dan WebP hingga 5 MB diproses menjadi WebP dan disimpan di PostgreSQL. Artikel terbit dapat dibaca publik; draf dan medianya memerlukan sesi Admin. Artikel demo menyertakan rujukan resmi Kementerian Pertanian.

Log mencatat autentikasi tanpa isi kredensial, perubahan data melalui API, kunjungan ke dashboard dan edukasi, perubahan akun/artikel, dan transisi status worker. Log dipertahankan 90 hari, lalu dihapus worker. Log tidak merekam kata sandi, kode OTP, token WhatsApp, atau payload laporan.

### Diagnostik layanan

- `database_not_configured` berarti proses Next.js belum menerima `DATABASE_URL`. Periksa `.env.local` untuk mode Bun, lalu mulai ulang server pengembangan.
- `database_connection_failed` berarti database belum dapat dijangkau atau kredensial koneksinya ditolak. Periksa status PostGIS dan alamat yang sesuai dengan mode aplikasi.
- `database_schema_missing` berarti tabel atau kolom yang dibutuhkan belum tersedia. Jalankan migrasi pada database VEKTOR yang dipakai aplikasi.
- Radar tetap menampilkan cuplikan dengan waktu pembaruan jika ada data tersimpan. Worker yang baru dimulai akan mengisi cuaca setelah berhasil menjangkau Open-Meteo.

## Uji lapangan

- Sajikan aplikasi lewat HTTPS dan set `BETTER_AUTH_URL` ke origin yang digunakan peserta. Contoh konfigurasi Caddy pada host adalah blok domain dengan `reverse_proxy 127.0.0.1:3000`. Set `FONNTE_TOKEN` dengan token perangkat yang digunakan untuk OTP pilot.
- Buka VEKTOR dan masuk saat terhubung. Pilih **Siapkan offline** sebelum berangkat. Untuk instalasi, gunakan menu browser **Instal aplikasi** atau **Tambahkan ke Layar Utama**. Saat koneksi kembali, VEKTOR mencoba mengirim ulang antrean. Browser tanpa Background Sync akan mencoba saat aplikasi dibuka atau mendeteksi koneksi kembali.
- Riwayat laporan terkirim memerlukan koneksi setelah pemuatan ulang. Saat offline, peta yang sudah disiapkan, cuplikan radar, dan antrean laporan lokal tetap tersedia.
- Pada instalasi Compose yang baru, jalankan `bun run push:setup .env mailto:operator@contoh.id` dengan alamat kontak operator, lalu buat ulang container aplikasi dan worker agar membaca nilai terbaru. Web Push aktif saat `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, dan `VAPID_SUBJECT` terisi. Petani memilih **Aktifkan notifikasi** dari kotak masuk. iPhone dan iPad memerlukan aplikasi yang dibuka dari Layar Utama. Kotak masuk tetap dapat digunakan ketika izin notifikasi ditolak.
- Worker memperbarui cuaca Karawang dari Open-Meteo dan mengirim push dari antrean database. Isi `OPEN_METEO_API_KEY` untuk memakai layanan pelanggan. Cadangkan volume PostgreSQL yang berisi laporan, foto, petak, kotak masuk, dan catatan penyaluran bantuan.
- Waktu di antarmuka ditampilkan dalam WIB. Berkas batas disederhanakan untuk keperluan pilot. Jika lokasi berada di luar batas atau di celah batas, form akan meminta penyesuaian pin.

## Alokasi bantuan PPL

Di **Dasbor PPL → Alokasi bantuan**, PPL menentukan kecamatan, barang, jumlah, dan satuan. **Lihat penyaluran** membuka riwayat dan form untuk mencatat jumlah yang diserahkan ke kelompok tani. Alokasi selesai ketika sisanya nol. Jumlah dicatat sebagai bilangan bulat dalam satuan yang dipilih. Daftar dan riwayat hanya dapat diakses oleh PPL.

- **Koreksi alokasi** mengubah jumlah dan catatan. Kecamatan, barang, dan satuan dapat diubah sebelum penyaluran pertama. Jumlah alokasi tetap harus mencukupi seluruh penyaluran yang aktif.
- **Koreksi penyaluran** memperbarui jumlah, penerima, atau catatan. **Batalkan** mengembalikan jumlah ke sisa alokasi dan mempertahankan catatan penyaluran sebagai dibatalkan. Alasan dan perubahan sebelum serta sesudahnya tampil di **Riwayat koreksi bantuan**.

## Verifikasi dan tindak lanjut PPL

Pilih laporan yang sudah ditinjau di antrean PPL untuk membuka **Riwayat verifikasi** atau **Koreksi keputusan**. Koreksi memerlukan alasan dan memicu penghitungan ulang radar. Jika koreksi mengubah klaster aktif menjadi tidak aktif, petak di kecamatan tersebut menerima pemberitahuan koreksi. **Riwayat tindak lanjut** menyimpan setiap pencatatan penyuluhan dan bantuan, termasuk catatan terakhir yang diimpor melalui migrasi.

Aplikasi memakai ID permintaan yang sama saat mencoba ulang siaran dan tindak lanjut yang belum mendapat konfirmasi. Klien API yang menginginkan perilaku ini dapat menyertakan `id` UUID pada `POST /api/ppl/broadcasts` dan `PUT /api/ppl/follow-ups`.

## Radar dan data

Landing page `/` dan pusat edukasi `/edukasi` terbuka untuk pengunjung. Seluruh `/radar`, termasuk Laporan, Petak, dan Peringatan, memerlukan akun terverifikasi. Tautan ke dasbor mengarahkan pengunjung ke halaman masuk dan kembali ke tujuan setelah sesi aktif. Dasbor `/ppl` khusus petugas; `/admin` khusus Admin. Permintaan peran yang tidak sesuai dialihkan ke radar. Radar dan antrean lokal tersedia saat offline pada perangkat yang sudah disiapkan ketika masuk.

Radar menghitung temuan terverifikasi selama tujuh hari terakhir per jenis dan kecamatan. Klaster DBSCAN dihitung di PostGIS dalam UTM zona 48S dengan radius 500 meter dan minimum tiga laporan. Kondisi cuaca ditampilkan untuk wilayah Karawang. Peringatan mengikuti kemunculan klaster aktif dan dikirim kepada akun dengan petak di kecamatan tersebut. Data radar agregat dapat tersimpan di perangkat untuk dibuka kembali tanpa jaringan. Foto, koordinat laporan, dan data petak dibatasi ke akun terkait sesuai perannya.

Perbesar peta untuk menampilkan lebih banyak nama kecamatan. Klik kecamatan untuk melihat jumlah laporan terverifikasi dan status klaster sesuai filter temuan yang aktif.

Isi `MAPTILER_API_KEY` di `.env.local` untuk pengembangan di host atau di `.env` untuk Compose, kemudian mulai ulang aplikasi. Gunakan kunci browser dan batasi ke origin VEKTOR di pengaturan MapTiler. Saat terhubung, **Peta** memakai Dataviz Light dan **Satelit** menampilkan citra. VEKTOR memakai PMTiles Karawang saat offline, tanpa kunci, atau saat peta online gagal dimuat. Tombol **Siapkan offline** menyimpan paket lokal. Lihat [pengaturan kunci MapTiler](https://docs.maptiler.com/guides/developer/credentials/api-key/).

Radar menampilkan tren empat periode tujuh hari berdasarkan laporan kondisi tidak sehat yang terverifikasi dan tanggal pengamatan WIB. Panduan pemeriksaan tersedia di radar, dan setiap laporan memiliki saran tindak lanjut berdasarkan status dan hasil verifikasi PPL. Waktu pembaruan ringkasan radar berubah saat agregat temuan berubah. Panel menandai cuaca sebagai kedaluwarsa ketika pengamatannya berusia 45 menit atau lebih.

Lihat [sumber dan lisensi peta](public/maps/README.md) dan [blueprint konsep VEKTOR](docs/blueprint_konsep_radar_hama_tanaman_webgis_pwa_edge_ai.md).

## Pemeriksaan

- `bun run lint`, `bun run typecheck`, `bun run test` (`bun test tests/unit`), dan `bun run build`.
- `bun run test:integration` menjalankan pengujian non-UI P0 dan P1 pada container PostGIS disposable tersendiri (port default `55433`, database `vektor_test`), stub loopback Fonnte terisolasi, server Next.js tersendiri (`127.0.0.1:3101`), serta harness Chromium headless tanpa halaman produk untuk antrean IndexedDB dan service worker. Runner ini tidak membaca database pengembangan/demo di port `5433` dan menghapus container disposable setelah selesai. Catatan: uji eksekusi ganda `scripts/seed.ts` membutuhkan lingkungan terisolasi di `:5433/vektor` (`VEKTOR_SEED_TEST_ISOLATED=1` dan `VEKTOR_SEED_TEST_URL=...`) apabila port `5433` tidak sedang dipakai database aktif.
- Untuk pengujian browser, jalankan `bunx playwright install chromium` dan `bun run test:fonnte` di terminal terpisah. Ekspor `FONNTE_TEST_URL=http://127.0.0.1:18080/send` untuk aplikasi dan runner. Gunakan database PostGIS tersendiri yang baru dimigrasikan, jalankan aplikasi dari build produksi dengan `BETTER_AUTH_URL` mengarah ke localhost, dan samakan `E2E_BASE_URL` dengan origin tersebut. Jalankan `bun --env-file=.env.local run test:e2e` jika konfigurasi VAPID aplikasi ada di `.env.local`. Stub OTP dan pengujian Web Push tidak menghubungi layanan eksternal.
- Skrip browser mencatat waktu respons verifikasi yang pertama kali mengaktifkan klaster untuk tiga laporan uji. Ukur kembali pada perangkat dan data pilot untuk menilai target latensi. Evaluasi F1 dan latensi inferensi menunggu model ONNX.

Foto persawahan pada landing page bersumber dari [Njc012 di Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cikampek_Rice_field_in_west_Java,_Indonesia.jpg) dengan lisensi CC0. Versi lokal diperkecil dan dikompresi ke WebP.
