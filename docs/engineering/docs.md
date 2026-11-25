<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:75f702bd9aac11fd8a14fbb3c077c1affb842193b6d8aca2e16e51a5eea38b21 -->
# docs

Sinkronkan dokumentasi dengan perubahan perilaku. Jelaskan kondisi terimplementasi, bukan asumsi.

## Dokumentasikan kondisi nyata

- Perbarui dokumen pemilik ketika perubahan mengubah perilaku, kontrak, setup, operasi, atau cara verifikasi.

- Pisahkan kondisi saat ini dari target atau rencana. Gunakan label status dan bukti source agar rencana tidak terbaca sebagai fitur yang sudah tersedia.

- Jelaskan alasan dan batasan aturan penting; hindari daftar slogan yang tidak membantu keputusan implementasi.

- Gunakan contoh dari pola yang benar-benar ada. Tandai contoh konseptual sebagai ilustrasi, bukan kontrak repository.


## Source of truth dan pemeliharaan

- Satu fakta memiliki satu dokumen pemilik; dokumen lain menautkan ke sana alih-alih menggandakan isi yang mudah berbeda.

- Tautkan ke path relatif yang valid dan gunakan nama file dengan makna jelas.

- Hapus atau tandai informasi usang ketika bukti implementasi berubah. Jangan mempertahankan instruksi hanya karena pernah benar.

- Jangan menyalin nilai `.env`, credential, atau data pribadi ke dokumentasi; gunakan nama variabel dan placeholder aman bila perlu.


## Contoh perubahan

- Perubahan kontrak API memperbarui referensi kontrak dan tes terkait, bukan hanya catatan release.

- Perubahan perintah setup memperbarui langkah onboarding dan environment yang diperlukan.


## Penerapan pada stack yang terdeteksi

- Belum ada catatan adaptasi khusus untuk stack ini. Ikuti aturan umum di panduan, periksa manifest, instruksi proyek, dan file sejenis, serta gunakan dokumentasi versi yang terpasang. Jangan menyalin konvensi dari framework lain.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
