# Blueprint Konsep Aplikasi Web: Radar Hama Tanaman (*Crop Epidemic & Vector Tracker*)

* **Tema Lomba:** *Empowering Innovation Through Technology*
* **Subtema:** Pertanian dan Ketahanan Pangan
* **Pendekatan Teknologi:** Client-Side Edge AI (ONNX), WebGIS (PostGIS & MapLibre GL), Offline-First Progressive Web App (PWA), dan Integrasi Meteorologi *Real-Time*
* **Nama Aplikasi:** VEKTOR (Vegetation Epidemic & Crop Threat Observation Radar)

---

## 1. Latar Belakang & Rumusan Masalah

### A. Permasalahan Nyata di Lapangan
Serangan Organisme Pengganggu Tumbuhan (OPT) seperti wereng batang cokelat (*Nilaparvata lugens*), blas daun (*Pyricularia oryzae*), dan hawar daun bakteri pada tanaman pangan sering kali menyebabkan penurunan produktivitas hingga gagal panen (puso). Permasalahan utama dalam pengendalian OPT di tingkat petani meliputi:
1. **Keterlambatan Deteksi & Pelaporan:** Petani kerap kesulitan mengidentifikasi gejala awal penyakit tanaman secara akurat dan baru melapor ke Petugas Penyuluh Lapangan (PPL) ketika serangan sudah meluas.
2. **Aplikasi Diagnosis yang Terisolasi:** Solusi identifikasi penyakit berbasis kamera yang ada saat ini hanya memberikan hasil secara individual di ponsel masing-masing pengguna tanpa memetakan risiko penularan ke lahan sekitar.
3. **Pengabaian Faktor Meteorologi (Angin):** Spora jamur patogen dan hama vektor menyebar mengikuti arah serta kecepatan angin dalam hitungan hari, sehingga petani di jalur hilir angin tidak memiliki peringatan dini.
4. **Keterbatasan Infrastruktur Internet (*Blank Spot*):** Lahan persawahan dan perkebunan umumnya memiliki koneksi internet yang tidak stabil, membuat aplikasi berbasis *cloud* murni sulit digunakan langsung di lapangan.

### B. Rujukan & Landasan Argumentasi Proposal
* **Direktorat Perlindungan Tanaman Pangan, Kementerian Pertanian RI:** Data statistik luas tambah serangan OPT utama (padi dan palawija) serta dampak kerugian produksi nasional.
* **Badan Pusat Statistik (BPS):** Statistik luas panen, produktivitas komoditas pangan utama, dan profil petani di Indonesia.
* **Jurnal Agronomi & Fitopatologi:** Kajian ilmiah mengenai mekanisme dispersi spora patogen tanaman berbasis arah dan kecepatan angin (*aerobiology*).

---

## 2. Solusi yang Ditawarkan (*Value Proposition*)

Membangun platform **Radar Hama Tanaman**, sebuah sistem intelijen epidemiologi pertanian berbasis komunitas yang mengubah setiap ponsel petani menjadi sensor deteksi dini. Aplikasi ini tidak hanya mendiagnosis penyakit tanaman secara *offline* di tengah sawah, tetapi juga memetakan klaster serangan dan memprediksi zona risiko penyebaran berbasis arah angin secara spasial.

---

## 3. Arsitektur Teknologi (Sinergi 4 Pilar Utama)

### A. Custom Edge AI (*Client-Side Computer Vision*)
Model kecerdasan buatan dilatih secara mandiri dan dijalankan langsung di browser perangkat pengguna tanpa memerlukan koneksi internet maupun biaya komputasi server (*inference API*):
* **Arsitektur Model:** **MobileNetV3-Large** / **EfficientNet-Lite0** (klasifikasi citra ringan) atau **YOLOv8n** (deteksi objek area bercak daun).
* **Fokus Komoditas & Kelas:** Difokuskan pada komoditas strategis (misalnya **Padi** dengan 5 kelas: *Sehat, Blas Daun, Hawar Daun Bakteri, Tungro/Wereng, dan Bercak Cokelat*) menggunakan kombinasi dataset publik dan augmentasi pencahayaan luar ruangan (*outdoor lighting*).
* **Optimasi Web:** Model diekspor ke format **ONNX** dan dikuantisasi (**INT8 / FP16**) agar ukuran berkas ringkas ($< 8\text{ MB}$), lalu dijalankan menggunakan **ONNX Runtime Web (WebAssembly / WebGL)** dengan waktu inferensi $< 200\text{ ms}$.
* **Validasi & Pengaman Model (*Confidence Guard*):** Menerapkan ambang batas keyakinan ($\ge 75\%$) untuk menolak gambar buram atau objek non-daun agar peta sebaran tetap akurat dan bebas dari *false positive*.

### B. WebGIS & Simulasi Sebaran Berbasis Angin
Menyajikan visualisasi spasial aktif menggunakan **MapLibre GL JS** di sisi klien dan **PostgreSQL + PostGIS** di sisi server:
* **Algoritma *Downwind Dispersion Cone* (Kerucut Sebaran Angin):** Setiap laporan serangan tervalidasi akan digabungkan dengan data arah dan kecepatan angin *real-time*. Menggunakan fungsi geometri PostGIS (`ST_Project` dan konstruksi poligon sektor), sistem otomatis menggambar zona kerucut risiko penularan sejauh $1\text{--}5\text{ km}$ searah hembusan angin untuk $24\text{--}72\text{ jam}$ ke depan.
* **Deteksi Klaster Wabah Otomatis:** Menggunakan fungsi spasial `ST_ClusterDBSCAN` untuk mengelompokkan laporan berdekatan. Jika ditemukan $\ge 3$ laporan penyakit sejenis dalam radius $500\text{ meter}$ selama $7\text{ hari}$ terakhir, status wilayah otomatis meningkat dari **Sporadis (Kuning)** menjadi **Klaster Wabah Aktif (Merah)**.

### C. Offline-First Progressive Web App (PWA)
Menjamin keandalan operasional di area pertanian minim sinyal:
* **Local Storage & Antrean Sinkronisasi:** Hasil pemindaian kamera (foto terkompresi, kelas diagnosis AI, *confidence score*, dan koordinat GPS) disimpan secara lokal di **IndexedDB** (via *Dexie.js*).
* **Caching Peta & Aset:** *Service Worker* menyimpan aset antarmuka serta *vector tiles* peta wilayah lokal sehingga radar tetap dapat dibuka tanpa internet.
* **Background Sync & Web Push Notification:** Saat perangkat kembali terhubung ke jaringan seluler, data otomatis terkirim ke server. Jika suatu petak lahan berada di dalam zona kerucut angin atau klaster baru, sistem segera mengirimkan notifikasi peringatan dini ke perangkat petani terkait.

### D. Integrasi Data Meteorologi & Real-Time Command Center
* **Integrasi API Cuaca:** Mengambil parameter arah angin (*wind direction*), kecepatan angin (*wind speed*), dan kelembapan udara dari API BMKG / Open-Meteo sebagai variabel pembobot risiko penyebaran.
* **Dasbor Pemantauan Langsung:** Menggunakan **Server-Sent Events (SSE) / WebSockets** agar petugas penyuluh dapat memantau masuknya laporan lapangan secara *real-time*.

---

## 4. Alur Pengguna (*User Journey*) & Fitur Utama

| Peran Pengguna | Alur Aktivitas di Aplikasi | Manfaat Utama |
| :--- | :--- | :--- |
| **Petani / Pengamat Lapangan** | 1. Membuka PWA di lahan (mendukung mode *offline*).<br>2. Memotret daun tanaman yang menunjukkan gejala.<br>3. Mendapatkan hasil diagnosis instan, tingkat keparahan, serta rekomendasi pengendalian hayati dan kimiawi terukur.<br>4. Menandai koordinat lahan ke peta radar. | Mendapatkan panduan penanganan awal secara cepat tanpa harus menunggu kunjungan petugas, serta menerima peringatan dini jika lahan tetangga di arah hulu angin terserang hama. |
| **Petugas PPL / Dinas Pertanian** | 1. Memantau peta interaktif *Command Center* WebGIS.<br>2. Menganalisis *heatmap* serangan, arah vektor angin, dan titik klaster wabah aktif.<br>3. Melakukan verifikasi laporan masuk untuk menjaga kualitas data.<br>4. Mengirim siaran peringatan serta mengalokasikan bantuan pengendalian OPT. | Pengambilan keputusan berbasis data spasial *real-time* sehingga distribusi pestisida, agens hayati, dan penyuluhan menjadi tepat sasaran. |

---

## 5. Metrik Evaluasi & Indikator Keberhasilan Prototipe

* **Performa Model AI:** Akurasi klasifikasi (*F1-Score*) $\ge 85\%$ pada data uji dan waktu inferensi lokal di perangkat seluler $< 250\text{ ms}$.
* **Keandalan Offline-First:** $100\%$ fitur pemindaian AI dan pencatatan koordinat tetap berfungsi tanpa koneksi internet, dengan sinkronisasi otomatis tanpa kehilangan data saat kembali daring.
* **Akurasi Pemetaan Spasial:** Pembentukan otomatis zona kerucut risiko angin dan deteksi klaster wabah dalam waktu $< 1\text{ detik}$ setelah laporan masuk ke server.