"use client";

import { BookOpen, ClipboardList, Megaphone, Package, Radar, UserRound } from "lucide-react";
import {
  educationPath,
  officerAidCreateDialogPath,
  officerAidPath,
  officerFollowUpDialogPath,
  officerFollowUpsPath,
  officerPath,
  officerReportsPath,
  profilePath,
} from "@/lib/routes";
import type { DashboardSearchItem } from "../_components/use-dashboard-global-search";

export const officerItems = [
  {
    id: "ppl-map",
    label: "Peta radar",
    shortLabel: "Peta",
    group: "Pemantauan",
    icon: Radar,
    href: officerPath,
    description: "Lihat sebaran temuan terverifikasi",
    keywords: "peta kecamatan hama",
  },
  {
    id: "ppl-queue",
    label: "Antrean laporan",
    shortLabel: "Laporan",
    group: "Verifikasi",
    icon: ClipboardList,
    href: officerReportsPath,
    description: "Tinjau laporan yang masuk",
    keywords: "verifikasi petani temuan foto",
  },
  {
    id: "ppl-actions",
    label: "Tindak lanjut",
    group: "Operasional",
    icon: Megaphone,
    href: officerFollowUpsPath,
    description: "Lihat penyuluhan dan bantuan per kecamatan",
    keywords: "siaran operasional petani",
  },
  {
    id: "ppl-aid",
    label: "Alokasi bantuan",
    shortLabel: "Bantuan",
    group: "Operasional",
    icon: Package,
    href: officerAidPath,
    description: "Lihat alokasi dan penyaluran",
    keywords: "pupuk benih kelompok tani",
  },
] as const;

export const officerSearchItems: readonly DashboardSearchItem[] = [
  ...officerItems,
  {
    id: "broadcast",
    label: "Kirim siaran",
    icon: Megaphone,
    href: officerFollowUpDialogPath("broadcast"),
    description: "Kirim informasi ke petani di kecamatan",
    keywords: "pesan notifikasi",
  },
  {
    id: "follow-up",
    label: "Catat tindak lanjut",
    icon: ClipboardList,
    href: officerFollowUpDialogPath("follow-up"),
    description: "Catat penyuluhan atau bantuan",
    keywords: "buat catatan kegiatan",
  },
  {
    id: "aid-create",
    label: "Buat alokasi",
    icon: Package,
    href: officerAidCreateDialogPath(),
    description: "Siapkan alokasi bantuan kecamatan",
    keywords: "tambah pupuk benih",
  },
  {
    id: "education",
    label: "Pusat edukasi",
    icon: BookOpen,
    href: educationPath,
    description: "Baca panduan pemantauan tanaman",
    keywords: "artikel belajar panduan",
  },
  {
    id: "profile",
    label: "Profil akun",
    icon: UserRound,
    href: profilePath,
    description: "Ubah nama, foto, dan kata sandi",
    keywords: "akun pengaturan avatar",
  },
];
