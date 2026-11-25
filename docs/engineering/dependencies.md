<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:d1e5a4f48ed0e7636b2d22230c16b919eaff25ce57b48f4a17f384cfe2f6305a -->
# dependencies

Jelaskan kebutuhan dependency baru sebelum menambahkannya; utamakan utilitas yang sudah sesuai.

## Sebelum menambah package

- Cari utilitas atau kemampuan framework yang sudah tersedia sebelum memilih dependency baru.

- Jelaskan kebutuhan, alternatif, ukuran dampak runtime, status pemeliharaan, license, dan kompatibilitas versi.

- Gunakan package manager dan lockfile yang dipakai repository; jangan edit lockfile secara manual.

- Jangan mengubah dependency langsung kecuali disetujui dalam scope task.


## Versi dan supply chain

- Periksa versi yang terkunci sebelum memakai API; nama package saja tidak membuktikan versinya.

- Pilih versi yang kompatibel dengan runtime dan dependency peer tanpa menghapus lockfile.

- Jangan menjalankan script install atau package tak dikenal selama analisis repository.


## Penerapan pada stack yang terdeteksi

- Belum ada catatan adaptasi khusus untuk stack ini. Ikuti aturan umum di panduan, periksa manifest, instruksi proyek, dan file sejenis, serta gunakan dokumentasi versi yang terpasang. Jangan menyalin konvensi dari framework lain.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
