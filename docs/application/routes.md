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


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
