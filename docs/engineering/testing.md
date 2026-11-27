<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:48100bdeb6b6c09040e9dbabe81d41c7fb722a1c293af945c8c9398f14e07589 -->
# testing

Pelihara test regresi bermakna untuk perubahan perilaku. Laporkan hasil aktual dan perintah yang belum dijalankan.

## Petakan perilaku sebelum menguji

- Temukan tes terdekat, setup fixture, fake, factory, dan helper yang sudah digunakan sebelum menambah pola baru.

- Uji hasil yang terlihat atau kontrak yang dijanjikan, bukan detail implementasi yang bebas berubah.

- Untuk bug, buat skenario yang gagal sebelum perbaikan atau bukti lain yang menunjukkan regresi telah tertutup.

- Jangan menghapus atau melemahkan tes untuk membuat suite lulus tanpa memperbaiki perilaku.


## Cakupan kasus

- Uji jalur normal, batas nilai, data kosong, input invalid, dan kegagalan dependency yang relevan.

- Untuk akses, uji pemilik yang benar, pengguna lain, dan pengguna tanpa autentikasi sesuai kontrak.

- Untuk UI data, periksa loading, empty, error, dan dataset besar jika komponen mendukung kondisi tersebut.

- Pastikan tes tidak bergantung pada urutan, waktu nyata, network luar, atau data lokal yang tidak dikontrol.


## Verifikasi dan laporan

- Gunakan command yang dideklarasikan repository dan jalankan subset terkecil yang mencakup perubahan sebelum suite lebih luas.

- Jangan menyatakan build atau test lulus jika command tidak dijalankan atau keluar dengan status gagal.

- Jika environment menghalangi tes, tulis command yang dicoba dan hambatan spesifiknya.

Skrip `bun run test:integration` menjalankan database PostGIS dan server Next.js sementara pada port terpisah. Server Next.js memakai direktori build `.next-integration` agar dapat berjalan saat server development utama aktif; skrip menghapus direktori itu dan container saat selesai.


## Penerapan pada stack yang terdeteksi

- Belum ada catatan adaptasi khusus untuk stack ini. Ikuti aturan umum di panduan, periksa manifest, instruksi proyek, dan file sejenis, serta gunakan dokumentasi versi yang terpasang. Jangan menyalin konvensi dari framework lain.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
