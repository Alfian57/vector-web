<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:84cc72bc56b6dc971e99ce0c112cd9e2345820ed3825be91c366ae1a5767ccb3 -->
# ui-tests

Uji perilaku UI yang berubah dengan runner proyek dan assertion yang bermakna bagi pengguna.

## Tes berdasarkan perilaku

- Uji interaksi yang dilihat pengguna: input, submit, navigasi, feedback, dan state data.

- Gunakan query berbasis role/label saat tersedia; hindari selector yang bergantung pada struktur DOM internal.

- Stub boundary network atau browser yang tidak deterministik; jangan mock fungsi murni yang mudah dijalankan.

- Tes submit gagal dan sukses secara terpisah, termasuk pesan dan nilai form setelah hasilnya.


## Kondisi UI

- Untuk daftar data, cover loading, kosong, error, dan pagination/data besar jika kondisi tersebut ada.

- Untuk keyboard, verifikasi urutan fokus, aktivasi kontrol, dan indikator fokus yang terlihat.

- Ikuti lokasi serta runner tes yang sudah digunakan project; jangan membuat runner kedua tanpa kebutuhan.


## Penerapan pada stack yang terdeteksi

- Uji komponen React lewat role, label, dan interaksi pengguna. Colocate tes hanya jika itu sudah menjadi pola repository.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
