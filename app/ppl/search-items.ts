import { BookOpen, ClipboardList, Megaphone, Package, Radar, UserRound } from "lucide-react";
import { educationPath, profilePath, radarPath } from "@/lib/routes";
import type { DashboardSearchItem } from "../_components/use-dashboard-global-search";

export function pplSearchItems(hasSelectedReport: boolean): DashboardSearchItem[] {
  return [
    {
      id: "ppl-map",
      label: "Peta radar",
      description: "Lihat sebaran temuan terverifikasi",
      keywords: "peta kecamatan hama",
      icon: Radar,
      href: "#ppl-map",
    },
    {
      id: "ppl-queue",
      label: "Antrean laporan",
      description: "Tinjau laporan yang masuk",
      keywords: "verifikasi petani temuan foto",
      icon: ClipboardList,
      href: "#ppl-queue",
    },
    ...(hasSelectedReport
      ? [
          {
            id: "ppl-review",
            label: "Laporan terpilih",
            description: "Periksa foto, gejala, dan keputusan",
            keywords: "verifikasi tinjau koreksi",
            icon: ClipboardList,
            href: "#ppl-review",
          },
        ]
      : []),
    {
      id: "ppl-actions",
      label: "Siaran dan tindak lanjut",
      description: "Kirim informasi atau catat penyuluhan",
      keywords: "operasional petani pesan penyuluhan",
      icon: Megaphone,
      href: "#ppl-actions",
    },
    {
      id: "ppl-aid",
      label: "Alokasi bantuan",
      description: "Catat alokasi dan penyaluran bantuan",
      keywords: "pupuk benih kelompok tani",
      icon: Package,
      href: "#ppl-aid",
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
      id: "radar",
      label: "Radar petani",
      description: "Buka pemantauan temuan",
      keywords: "peta laporan petak peringatan",
      icon: Radar,
      href: radarPath,
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
}
