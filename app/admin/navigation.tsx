"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, ScrollText, Users } from "lucide-react";
import { adminAccountsPath, adminEducationPath, adminLogsPath, adminPath } from "@/lib/routes";

const items = [
  { href: adminPath, label: "Ringkasan", icon: LayoutDashboard },
  { href: adminAccountsPath, label: "Akun", icon: Users },
  { href: adminEducationPath, label: "Edukasi", icon: BookOpen },
  { href: adminLogsPath, label: "Log aktivitas", icon: ScrollText },
] as const;

export function AdminNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Navigasi admin">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={18} />{label}</Link>)}</nav>;
}
