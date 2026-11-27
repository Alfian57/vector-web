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
- `/radar` memerlukan sesi aktif. `/ppl` hanya untuk peran `officer`; `/admin` beserta subroute `/admin/accounts`, `/admin/education`, dan `/admin/logs` hanya untuk peran `admin`.
- `/api/education` dan `/api/education/[slug]` hanya mengembalikan artikel terbit. Media draf memerlukan sesi Admin.
- Endpoint `/api/admin/*` memeriksa sesi Admin di handler API. Pengelolaan akun hanya dapat menetapkan peran `farmer` atau `officer`; UI tidak dapat membuat Admin.
- `/api/admin/search?q=...` mengembalikan maksimal lima akun, artikel edukasi, dan log yang cocok untuk dialog pencarian Admin.
- `/api/search?q=...` memerlukan sesi dan membatasi hasil berdasarkan peran: petani hanya mencari laporan, petak, dan peringatan miliknya serta edukasi terbit; PPL mencari antrean laporan, tindak lanjut, alokasi bantuan, dan edukasi terbit. Admin menggunakan endpoint pencarian Admin yang memeriksa perannya.
- `/profil` tersedia untuk akun yang masuk dari seluruh role. `/api/profile` hanya mengembalikan kontak akun sendiri dan menerima perubahan nama; `/api/profile/avatar` hanya mengakses avatar milik sesi aktif. Email dan WhatsApp tetap baca-saja hingga tersedia alur verifikasi kontak yang sesuai.
- `/api/auth/change-password` memakai validasi Better Auth, meminta kata sandi saat ini, dan dapat mengakhiri sesi akun di perangkat lain.
- Perubahan route harus memperbarui suite kontrak pemilik alurnya: akses umum dan peran di `tests/integration/access-privacy.test.ts`, autentikasi WhatsApp di `tests/integration/whatsapp-auth.test.ts`, profil di `tests/integration/profile.test.ts`, serta administrasi dan edukasi di `tests/integration/admin-education-logs.test.ts`. Perubahan navigasi yang terlihat pengguna juga perlu dicakup oleh suite terkait di `tests/e2e/`.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
