"use client";

import { BookOpen, LayoutDashboard, ScrollText, Users } from "lucide-react";
import { adminAccountsPath, adminEducationPath, adminLogsPath, adminPath } from "@/lib/routes";

export const adminItems = [
  {
    href: adminPath,
    label: "Ringkasan",
    group: "Ikhtisar",
    keywords: "dashboard operasional statistik",
    icon: LayoutDashboard,
  },
  {
    href: adminAccountsPath,
    label: "Akun dan akses",
    shortLabel: "Akun",
    group: "Pengelolaan",
    keywords: "pengguna petani petugas role banned nonaktif",
    icon: Users,
  },
  {
    href: adminEducationPath,
    label: "Edukasi",
    group: "Pengelolaan",
    keywords: "artikel panduan konten editor",
    icon: BookOpen,
  },
  {
    href: adminLogsPath,
    label: "Log aktivitas",
    shortLabel: "Log",
    group: "Audit",
    keywords: "audit riwayat kejadian sistem worker",
    icon: ScrollText,
  },
] as const;
