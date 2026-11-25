<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:9d56f919b7abb53deb087165cab491754412a1f5b49907a8151060e0bb2df9cd -->
# ui-size

Evaluasi komponen UI di atas 250 baris untuk ekstraksi terfokus; ini batas lunak.

## Batas lunak, bukan target

- Tinjau komponen UI yang melampaui sekitar 250 baris untuk menemukan tanggung jawab yang benar-benar terpisah.

- Jangan ekstrak komponen hanya untuk menurunkan hitungan baris jika alur data dan perilaku tetap sulit dipahami.

- Pertahankan colocated bagian yang hanya dimiliki satu fitur; pindahkan ke shared layer saat ada pemakai nyata lintas fitur.


## Ekstraksi yang sehat

- Pisahkan UI dari state/mutation ketika logika tersebut bisa diuji atau digunakan secara independen.

- Jaga props dan return values tetap eksplisit; hindari komponen wrapper yang hanya meneruskan semua props.

- Selesaikan satu ekstraksi dalam task aktif dan pastikan tes perilaku tetap melindungi interaksi.


## Penerapan pada stack yang terdeteksi

- Belum ada catatan adaptasi khusus untuk stack ini. Ikuti aturan umum di panduan, periksa manifest, instruksi proyek, dan file sejenis, serta gunakan dokumentasi versi yang terpasang. Jangan menyalin konvensi dari framework lain.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
