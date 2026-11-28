<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:a308f755f7dcf7b8f14832771151286a2fdfdb1dae734d88ebf7532a1f9cf450 -->
# accessibility

Periksa navigasi keyboard, focus terlihat, dan label kontrol aksesibel.

## Semantik dan nama aksesibel

- Gunakan elemen HTML semantik dan kontrol native sebelum membuat widget custom.

- Setiap input memiliki label yang terhubung; tombol dan link menyebutkan tujuan dengan jelas.

- Pesan error, status sukses, dan perubahan dinamis diumumkan melalui pola aksesibel yang sesuai.

- Gambar informatif memiliki teks alternatif; gambar dekoratif tidak menambah noise pembaca layar.

## Feedback transien

- Hasil berhasil dan informasi singkat setelah tindakan memakai `showToast` dari `app/_components/toast.tsx`. Toast tampil di kanan bawah, diumumkan oleh Base UI, dan dapat ditutup.

- Error validasi dan error yang perlu segera diperbaiki tetap ditampilkan dekat field atau dialog terkait agar konteks input tidak hilang.


## Keyboard, fokus, dan visual

- Semua fungsi dapat dijalankan dengan keyboard tanpa jebakan fokus.

- Jangan menghapus outline tanpa pengganti yang terlihat dan kontras.

- Informasi tidak dibedakan hanya melalui warna; periksa kontras teks dan kontrol.

- Hormati preferensi reduced motion dan hindari animasi yang mengganggu tugas.


## Penerapan pada stack yang terdeteksi

- Belum ada catatan adaptasi khusus untuk stack ini. Ikuti aturan umum di panduan, periksa manifest, instruksi proyek, dan file sejenis, serta gunakan dokumentasi versi yang terpasang. Jangan menyalin konvensi dari framework lain.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
