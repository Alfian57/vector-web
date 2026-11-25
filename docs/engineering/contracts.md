<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:f72c3f89345ac5abc6b0253a5cb3570416b5f140f17dd57c19137a2ce2c76bf3 -->
# contracts

Pertahankan kontrak API, otorisasi, ownership, dan privasi. Jangan mencatat kredensial atau payload sensitif.

## Kontrak dan kompatibilitas

- Sebelum mengubah endpoint, event, schema, atau file format, cari seluruh pemanggil dan tes yang bergantung padanya.

- Pertahankan nama field, status/error semantics, format tanggal, pagination, dan bentuk respons kecuali perubahan kontrak memang diminta.

- Perubahan database harus mempertimbangkan data lama, urutan deploy, rollback, dan proses yang membaca schema tersebut.

- Jangan memperluas hak akses, ownership, tenant scope, atau visibility hanya untuk membuat alur baru lebih mudah.


## Validasi, otorisasi, dan privasi

- Validasi data tidak tepercaya di server pada batas input; client-side validation hanya membantu pengalaman pengguna.

- Periksa otorisasi pada setiap operasi baca dan tulis terhadap resource yang benar, bukan hanya menyembunyikan tombol UI.

- Kembalikan hanya field yang diperlukan oleh pemanggil. Audit log menyimpan metadata minimum, bukan rahasia atau payload penuh.

- Gunakan transaksi dan idempotensi saat beberapa perubahan harus berhasil sebagai satu unit atau callback dapat diulang.


## Perubahan kontrak

- Nyatakan siapa yang terdampak, field atau perilaku apa yang berubah, dan strategi kompatibilitasnya.

- Tambahkan tes untuk akses yang diizinkan, ditolak, dan data yang tidak boleh bocor.


## Penerapan pada stack yang terdeteksi

- Belum ada catatan adaptasi khusus untuk stack ini. Ikuti aturan umum di panduan, periksa manifest, instruksi proyek, dan file sejenis, serta gunakan dokumentasi versi yang terpasang. Jangan menyalin konvensi dari framework lain.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
