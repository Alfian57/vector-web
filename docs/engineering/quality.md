<!-- BEGIN my-skill-gweh -->
<!-- my-skill-gweh-sha256:7069cd8ef1e18ec3db25171ba7b0087c5da5b51f92c757a6fdea93b8c6b683b4 -->
# quality

Jaga modul tetap terfokus; pisahkan logika UI kompleks, gunakan co-location, dan manfaatkan abstraksi yang ada.

## Batas tanggung jawab

Perubahan harus mengikuti pola repository yang sudah terbukti. Periksa file tetangga, abstraksi yang tersedia, dan pengujian terkait sebelum memilih struktur baru.

- Satu modul memiliki satu alasan utama untuk berubah. Pisahkan parsing, aturan domain, akses data, dan penyajian ketika batasnya memang berbeda.

- Jangan menambah lapisan, service, base class, atau folder arsitektur hanya untuk memindahkan beberapa baris kode.

- Refactor bagian yang diperlukan untuk perubahan aktif; catat temuan pada file lain tanpa memperluas scope.


## Keterbacaan dan ukuran

- Gunakan nama yang menyatakan maksud dan tipe yang spesifik. Hindari singkatan lokal, nilai sentinel tersembunyi, serta komentar yang sekadar mengulang kode.

- Utamakan abstraksi yang sudah dipakai repository; generalisasi baru perlu lebih dari satu kebutuhan nyata atau batas domain yang jelas.


## Kebenaran dan kegagalan

- Validasi input di batas sistem sebelum dipakai oleh domain atau persistence. Jangan menganggap tipe compile-time sebagai validasi data runtime.

- Tangani kegagalan secara eksplisit: pertahankan konteks error, berikan respons yang sesuai, dan jangan menelan exception tanpa alasan.

- Jangan mencatat credential, token, payload sensitif, atau data personal yang tidak diperlukan untuk diagnosis.


## Penerapan pada stack yang terdeteksi

- Untuk UI React, pisahkan state/mutation yang kompleks dari komponen presentasi hanya ketika batas tersebut membuat perilaku lebih mudah dipahami atau diuji.

- Project memakai Next.js App Router. Pertahankan Server Component sebagai default dan letakkan `use client` dekat interaksi browser.


[Konteks proyek](../project/context.md)
<!-- END my-skill-gweh -->
