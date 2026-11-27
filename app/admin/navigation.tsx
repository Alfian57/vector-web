"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, ScrollText, Users } from "lucide-react";
import { adminAccountsPath, adminEducationPath, adminLogsPath, adminPath } from "@/lib/routes";

export const adminItems = [
  { href: adminPath, label: "Ringkasan", keywords: "dashboard operasional statistik", icon: LayoutDashboard },
  {
    href: adminAccountsPath,
    label: "Akun dan akses",
    keywords: "pengguna petani petugas role banned nonaktif",
    icon: Users,
  },
  { href: adminEducationPath, label: "Edukasi", keywords: "artikel panduan konten editor", icon: BookOpen },
  { href: adminLogsPath, label: "Log aktivitas", keywords: "audit riwayat kejadian sistem worker", icon: ScrollText },
] as const;

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi admin">
      {adminItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
