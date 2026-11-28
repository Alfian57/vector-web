import {
  BookOpen,
  ClipboardList,
  MapPin,
  Megaphone,
  Package,
  Radar,
  ScanLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Account } from "@/lib/domain";
import {
  educationPath,
  officerPath,
  officerReportsPath,
  officerFollowUpsPath,
  officerAidPath,
  profilePath,
  radarSectionPath,
} from "@/lib/routes";
import type { DashboardSearchItem } from "./use-dashboard-global-search";

export function radarSearchItems(role: Exclude<Account["role"], "admin">) {
  const items: DashboardSearchItem[] = [
    {
      id: "radar",
      label: "Radar",
      description: "Peta temuan hama dan kondisi cuaca",
      keywords: "peta pemantauan kecamatan",
      icon: Radar,
      href: radarSectionPath("radar"),
    },
    {
      id: "reports",
      label: "Laporan saya",
      description: "Lihat laporan dan antrean perangkat",
      keywords: "temuan terkirim sinkronisasi riwayat",
      icon: ClipboardList,
      href: radarSectionPath("reports"),
    },
    {
      id: "create-report",
      label: "Buat laporan",
      description: "Catat temuan padi di lahan",
      keywords: "foto kamera hama penyakit",
      icon: ScanLine,
      href: `${radarSectionPath("reports")}#buat-laporan`,
    },
    {
      id: "plots",
      label: "Petak pantauan",
      description: "Kelola lokasi sawah yang dipantau",
      keywords: "lahan lokasi sawah peta",
      icon: MapPin,
      href: radarSectionPath("plots"),
    },
    {
      id: "create-plot",
      label: "Tambah petak",
      description: "Daftarkan lokasi sawah",
      keywords: "buat petak pantauan lokasi",
      icon: MapPin,
      href: `${radarSectionPath("plots")}#tambah-petak`,
    },
    {
      id: "education",
      label: "Pusat edukasi",
      description: "Baca panduan pemantauan tanaman",
      keywords: "artikel belajar panduan",
      icon: BookOpen,
      href: educationPath,
    },
    {
      id: "profile",
      label: "Profil akun",
      description: "Ubah nama, foto, dan kata sandi",
      keywords: "akun pengaturan avatar password",
      icon: UserRound,
      href: profilePath,
    },
  ];

  if (role === "officer") {
    items.push({
      id: "officer-dashboard",
      label: "Dasbor PPL",
      description: "Verifikasi temuan dan catat tindak lanjut",
      keywords: "petugas laporan bantuan operasional",
      icon: ShieldCheck,
      href: officerPath,
    });
    items.push({
      id: "officer-queue",
      label: "Antrean laporan PPL",
      description: "Tinjau laporan yang masuk",
      keywords: "verifikasi petani laporan",
      icon: ClipboardList,
      href: officerReportsPath,
    });
    items.push({
      id: "officer-actions",
      label: "Tindak lanjut PPL",
      description: "Kelola siaran dan catatan penyuluhan",
      keywords: "operasional petani pesan penyuluhan",
      icon: Megaphone,
      href: officerFollowUpsPath,
    });
    items.push({
      id: "officer-aid",
      label: "Alokasi bantuan PPL",
      description: "Catat alokasi dan penyaluran bantuan",
      keywords: "pupuk benih kelompok tani",
      icon: Package,
      href: officerAidPath,
    });
  }

  return items;
}
