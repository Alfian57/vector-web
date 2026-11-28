<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:2a68315ac720e91a65931640484ddb069972b519e9c3d0c2569fcb51cfe78888 -->
# routes

Gunakan helper rute proyek dan jaga perilaku URL pada boundary pemiliknya.

## Pemetaan route

- Cari definisi route, middleware, nama route, dan pemanggil sebelum mengubah URL atau method.

- Pertahankan route name/constant yang sudah menjadi sumber link dan redirect; jangan membuat string path duplikat.

- Tempatkan endpoint baru mengikuti pengelompokan dan middleware route yang berdekatan.

- Pisahkan autentikasi, authorization resource, dan validasi input; ketiganya melindungi boundary yang berbeda.


## URL dan integrasi

- Gunakan URL generator atau helper yang telah dipakai proyek untuk link internal.

- Untuk route API, pertahankan versi, format respons, status code, dan validasi agar client tetap kompatibel.

- Perubahan route publik memerlukan tes akses dan dokumentasi kontrak yang sesuai.


## Penerapan pada stack yang terdeteksi

- Pertahankan struktur App Router dan file privat sesuai pola route yang ada.

## Route VEKTOR

- `/` adalah landing page publik. `/edukasi` dan `/edukasi/[slug]` menyajikan artikel yang sudah terbit. `/masuk` tersedia tanpa sesi; akun dengan sesi valid diarahkan ke dashboard sesuai rolenya, kecuali mode `link` untuk menghubungkan WhatsApp.
- Radar Petani hanya dapat dibuka oleh role `farmer`. Halaman daftar tersedia di `/radar/reports` dan `/radar/plots`; notifikasi tersedia melalui dropdown ikon di navbar. Formulir laporan baru dan petak baru dibuka sebagai dialog pada halaman daftar masing-masing. Perbaikan laporan antrean tersedia di `/radar/reports/[id]/edit` dan hanya membaca antrean milik akun aktif di perangkat. Endpoint petak, peringatan, langganan notifikasi, serta laporan milik Petani hanya menerima role `farmer`.
- PPL hanya untuk peran `officer` dan tidak dapat membuka dashboard Petani. Buka peta radar terverifikasi di `/ppl`, antrean di `/ppl/reports`, tindak lanjut dan siaran di `/ppl/follow-ups`, serta alokasi di `/ppl/aid-allocations`. Peta radar PPL memakai agregat bersama; antrean laporan tersedia melalui `GET /api/reports?scope=ppl`. Form siaran dan tindak lanjut dibuka sebagai dialog melalui query `dialog=broadcast` atau `dialog=follow-up`; form alokasi baru dibuka melalui `dialog=create`. Detail alokasi ada di `/ppl/aid-allocations/[id]`; koreksi alokasi, pencatatan penyaluran, koreksi penyaluran, dan pembatalannya dibuka sebagai dialog melalui `dialog=allocation-edit`, `dialog=delivery-create`, `dialog=delivery-edit`, dan `dialog=delivery-cancel`. Aksi pada baris penyaluran juga memakai query `deliveryId`.
- Admin hanya untuk peran `admin`. Buka `/admin`, `/admin/accounts`, `/admin/education`, dan `/admin/logs`. Aksi kelola akses akun, buat artikel, dan sunting artikel dibuka sebagai dialog dari daftar. Parameter `manage`, `create`, dan `edit` dapat membuka dialog yang sama melalui tautan langsung.
- Query string memuat preferensi tampilan data seperti filter, pencarian, pagination, dan dialog yang sedang dibuka. Tujuan setelah masuk hanya menerima rute internal dashboard yang dikenali.
- Filter, pagination, dan dialog daftar disimpan di query URL agar dapat dibagikan, dipulihkan setelah reload, dan dinavigasi dengan Back/Forward. Nomor halaman dimulai dari `0`; nilai awal `0` dihilangkan dari URL. Query yang digunakan: `/radar` memakai `finding`, `clustersPage`, dan `findingsPage`; `/radar/reports` memakai `status`, `finding`, `page`, dan `queuePage`; `/radar/plots` memakai `page`; antrean `/ppl/reports` memakai `status`, `finding`, dan `page`; `/ppl/follow-ups` memakai `dialog`, `page`, dan `historyPage`; `/ppl/aid-allocations` memakai `dialog` dan `page`; detail alokasi memakai `dialog`, `deliveryId`, `page`, dan `historyPage`; riwayat laporan PPL memakai `page` dan `historyPage` secara terpisah; `/admin/accounts` memakai `q`, `role`, `state`, dan `page`; `/admin/logs` memakai `q`, `kind`, `category`, `from`, `to`, dan `page`; `/admin/education` memakai `status` dan `page`; `/edukasi` memakai `q`, `category`, dan `page`. Tanggal log menggunakan format `YYYY-MM-DD` dan ditafsirkan sebagai hari kalender WIB.
- `/api/education` dan `/api/education/[slug]` hanya mengembalikan artikel terbit, dengan `thumbnailSrc` bernilai URL lokal atau `null`. Media publik harus dirujuk oleh artikel terbit melalui thumbnail atau isi panduan. Media lain memerlukan sesi Admin.
- Endpoint simpan Admin `POST /api/admin/education` dan `PATCH /api/admin/education/[id]` menerima JSON seperti sebelumnya. Untuk gambar baru, kirim multipart berisi JSON di field `article` dan file di field `image:<referensi>`. Gunakan referensi `pending-image:<UUID>` pada `thumbnailSrc` atau atribut `src` gambar isi panduan. Respons simpan mengembalikan URL thumbnail dan pemetaan `imageSources` dari referensi sementara ke URL media. Pada PATCH JSON, melewatkan `thumbnailSrc` mempertahankan thumbnail dan mengirim `null` menghapusnya.
- Endpoint `/api/admin/*` memeriksa sesi Admin di handler API. Pengelolaan akun hanya dapat menetapkan peran `farmer` atau `officer`; UI tidak dapat membuat Admin.
- `/api/admin/search?q=...` mengembalikan maksimal lima akun, artikel edukasi, dan log yang cocok untuk dialog pencarian Admin.
- `/api/search?q=...` memerlukan sesi dan membatasi hasil berdasarkan peran: petani hanya mencari laporan, petak, serta edukasi terbit; PPL mencari antrean laporan, tindak lanjut, alokasi bantuan, dan edukasi terbit. Admin menggunakan endpoint pencarian Admin yang memeriksa perannya.
- `/profil` tersedia untuk akun yang masuk dari seluruh role. `/api/profile` hanya mengembalikan kontak akun sendiri dan menerima perubahan nama; `/api/profile/avatar` hanya mengakses avatar milik sesi aktif. Email dan WhatsApp tetap baca-saja hingga tersedia alur verifikasi kontak yang sesuai.
- `/api/auth/change-password` memakai validasi Better Auth, meminta kata sandi saat ini, dan dapat mengakhiri sesi akun di perangkat lain.
- Perubahan route harus memperbarui suite kontrak pemilik alurnya: akses umum dan peran di `tests/integration/access-privacy.test.ts`, autentikasi WhatsApp di `tests/integration/whatsapp-auth.test.ts`, profil di `tests/integration/profile.test.ts`, serta administrasi dan edukasi di `tests/integration/admin-education-logs.test.ts`. Perubahan navigasi yang terlihat pengguna juga perlu dicakup oleh suite terkait di `tests/e2e/`.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
