<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:e7f76be74ac37627c4294e36b2837a8d635d2d3acd8ba86e539df9ed016446f5 -->
# forms

Sediakan label field yang jelas, validasi server, serta status submit dan error yang terlihat.

## Kontrak field dan validasi

- Label menjelaskan data yang diminta; tandai field wajib dan opsional dengan istilah yang konsisten.

- Placeholder memberi contoh format, bukan menggantikan label atau instruksi aksesibel.

- Validasi server tetap otoritatif. Samakan batas, format, dan pesan dengan validasi client bila keduanya ada.

- Tampilkan error dekat field dan pertahankan input yang valid setelah kegagalan submit bila pola aplikasi mendukungnya.


## Kondisi interaksi

- Cegah submit ganda ketika request berlangsung dan tampilkan status loading yang dapat dipahami.

- Berikan hasil sukses atau gagal yang nyata; jangan menghapus nilai atau menutup dialog sebelum operasi berhasil.

- Aksi destruktif meminta konfirmasi kustom yang menyebutkan konsekuensi dan objek terdampak.


## Penerapan pada stack yang terdeteksi

- Gunakan state submit yang eksplisit dan cegah submit berulang; tampilkan error field dari sumber validasi yang otoritatif.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
