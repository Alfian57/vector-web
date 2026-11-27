import type { Finding, ReportStatus, Severity } from "../generated/prisma/client";

export const districts = {
  cikampek: "32-15-13",
  jatisari: "32-15-14",
  klari: "32-15-05",
  rengasdengklok: "32-15-06",
  tirtamulya: "32-15-16",
  telukjambe: "32-15-03",
  cilamaya: "32-15-15",
  tempuran: "32-15-20",
} as const;

export const plots = [
  [districts.cikampek, "Petak Utara"],
  [districts.jatisari, "Petak Saluran Timur"],
  [districts.klari, "Petak Selatan"],
] as const;

type DemoReport = {
  key: number;
  district: string;
  hoursAgo: number;
  finding: Finding;
  status: ReportStatus;
  severity?: Severity;
  notes: string;
  corrected?: boolean;
};

export const reports: readonly DemoReport[] = [
  { key: 1, district: districts.cikampek, hoursAgo: 3, finding: "unknown", status: "pending", notes: "Bercak terlihat saat pengecekan pagi. Mohon tinjau dari antrean PPL." },
  { key: 2, district: districts.klari, hoursAgo: 7, finding: "brown_spot", status: "pending", notes: "Beberapa daun berubah warna di sisi saluran." },
  { key: 3, district: districts.tempuran, hoursAgo: 19, finding: "unknown", status: "pending", notes: "Perlu kunjungan lanjutan untuk memeriksa kondisi petak." },
  { key: 4, district: districts.cikampek, hoursAgo: 26, finding: "blast", status: "verified", severity: "moderate", corrected: true, notes: "Temuan saat kunjungan ulang di Petak Utara." },
  { key: 5, district: districts.cikampek, hoursAgo: 44, finding: "blast", status: "verified", severity: "mild", notes: "Temuan di dekat pembatas petak." },
  { key: 6, district: districts.cikampek, hoursAgo: 62, finding: "blast", status: "verified", severity: "moderate", notes: "Temuan di titik pemantauan kedua." },
  { key: 7, district: districts.cikampek, hoursAgo: 84, finding: "blast", status: "verified", severity: "mild", notes: "Temuan awal dari inspeksi berkala." },
  { key: 8, district: districts.jatisari, hoursAgo: 32, finding: "planthopper", status: "verified", severity: "moderate", notes: "Temuan di sisi timur petak pantauan." },
  { key: 9, district: districts.jatisari, hoursAgo: 52, finding: "planthopper", status: "verified", severity: "mild", notes: "Temuan saat pengamatan rutin pagi." },
  { key: 10, district: districts.jatisari, hoursAgo: 76, finding: "planthopper", status: "verified", severity: "moderate", notes: "Pengamatan lanjutan pada petak yang berdekatan." },
  { key: 11, district: districts.klari, hoursAgo: 42, finding: "brown_spot", status: "verified", severity: "mild", notes: "Temuan pada beberapa daun di batas petak." },
  { key: 12, district: districts.klari, hoursAgo: 86, finding: "brown_spot", status: "verified", severity: "mild", notes: "Temuan pada inspeksi sebelum jadwal penyuluhan." },
  { key: 13, district: districts.telukjambe, hoursAgo: 68, finding: "blight", status: "verified", severity: "moderate", notes: "Temuan tunggal pada pemeriksaan lapangan." },
  { key: 14, district: districts.rengasdengklok, hoursAgo: 91, finding: "tungro", status: "verified", severity: "mild", notes: "Laporan diperiksa saat kunjungan PPL." },
  { key: 15, district: districts.cilamaya, hoursAgo: 49, finding: "healthy", status: "verified", severity: "mild", notes: "Pengamatan rutin dengan kondisi tanaman sehat." },
  { key: 16, district: districts.cikampek, hoursAgo: 105, finding: "unknown", status: "rejected", notes: "Sampel foto tidak memperlihatkan detail daun." },
  { key: 17, district: districts.tirtamulya, hoursAgo: 119, finding: "unknown", status: "rejected", notes: "Laporan perlu dikirim ulang dengan dokumentasi yang lebih jelas." },
  { key: 18, district: districts.cikampek, hoursAgo: 195, finding: "blast", status: "verified", severity: "mild", notes: "Catatan pengamatan minggu sebelumnya." },
  { key: 19, district: districts.tempuran, hoursAgo: 213, finding: "brown_spot", status: "verified", severity: "mild", notes: "Temuan pada kunjungan pemantauan keliling." },
  { key: 20, district: districts.jatisari, hoursAgo: 230, finding: "planthopper", status: "verified", severity: "moderate", notes: "Temuan sebelum pendampingan berikutnya." },
  { key: 21, district: districts.telukjambe, hoursAgo: 253, finding: "blight", status: "verified", severity: "mild", notes: "Laporan lama dari titik pemantauan timur." },
  { key: 22, district: districts.cilamaya, hoursAgo: 285, finding: "brown_spot", status: "verified", severity: "mild", notes: "Catatan pembanding dari pemantauan sebelumnya." },
  { key: 23, district: districts.klari, hoursAgo: 369, finding: "brown_spot", status: "verified", severity: "mild", notes: "Catatan pembuka untuk tren Klari." },
  { key: 24, district: districts.jatisari, hoursAgo: 393, finding: "planthopper", status: "verified", severity: "mild", notes: "Temuan lama dari titik dekat saluran." },
  { key: 25, district: districts.rengasdengklok, hoursAgo: 419, finding: "tungro", status: "verified", severity: "mild", notes: "Laporan dari inspeksi awal kelompok tani." },
  { key: 26, district: districts.cikampek, hoursAgo: 542, finding: "blast", status: "verified", severity: "mild", notes: "Catatan awal dalam rentang empat minggu." },
  { key: 27, district: districts.tempuran, hoursAgo: 566, finding: "brown_spot", status: "verified", severity: "mild", notes: "Temuan awal sebelum jadwal pengamatan berkala." },
];

export const followUps = [
  { key: 301, districtId: districts.cikampek, kind: "outreach", status: "planned", hoursAgo: 59, note: "Demo: jadwalkan kunjungan penyuluhan di Petak Utara." },
  { key: 302, districtId: districts.cikampek, kind: "outreach", status: "complete", hoursAgo: 18, note: "Demo: kunjungan dan pencatatan ulang telah selesai." },
  { key: 303, districtId: districts.jatisari, kind: "assistance", status: "planned", hoursAgo: 10, note: "Demo: konfirmasi kebutuhan alat pemantauan untuk kelompok tani." },
  { key: 304, districtId: districts.klari, kind: "outreach", status: "planned", hoursAgo: 8, note: "Demo: siapkan sesi pembacaan radar bersama kelompok tani." },
] as const;

export const allocations = [
  { key: 401, districtId: districts.cikampek, item: "Demo · Perlengkapan pemantauan", quantity: 60, unit: "paket", note: "Penyaluran bertahap untuk dua kelompok tani.", hoursAgo: 46 },
  { key: 402, districtId: districts.jatisari, item: "Demo · Buku catatan lapangan", quantity: 24, unit: "buku", note: "Semua buku telah diterima kelompok tani.", hoursAgo: 72 },
  { key: 403, districtId: districts.klari, item: "Demo · Lembar panduan inspeksi", quantity: 40, unit: "lembar", note: "Alokasi disiapkan untuk penyuluhan berikutnya.", hoursAgo: 28 },
] as const;

export const deliveries = [
  { key: 411, allocation: 401, quantity: 20, recipient: "Demo · Kelompok Tani Maju", note: "Penyaluran tahap pertama.", hoursAgo: 43 },
  { key: 412, allocation: 401, quantity: 16, previousQuantity: 14, recipient: "Demo · Kelompok Tani Rukun", note: "Jumlah sesuai berita acara penerimaan.", hoursAgo: 22 },
  { key: 413, allocation: 402, quantity: 24, recipient: "Demo · Kelompok Tani Harapan", note: "Penyaluran selesai.", hoursAgo: 30 },
] as const;
