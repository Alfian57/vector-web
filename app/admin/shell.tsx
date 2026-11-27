import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, ShieldCheck } from "lucide-react";
import { Brand } from "@/app/_components/brand";
import { educationPath, homePath } from "@/lib/routes";
import { AdminSignOut } from "./sign-out";
import { AdminNavigation } from "./navigation";
import "./admin.css";

export function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <Brand />
      <p className="admin-side-label">PENGELOLAAN</p>
      <AdminNavigation />
      <div className="admin-side-bottom"><Link href={educationPath}><BookOpen size={18} />Lihat edukasi</Link><Link href={homePath}><ShieldCheck size={18} />Kembali ke beranda</Link><AdminSignOut /></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div className="admin-mobile-brand"><Brand /></div><span className="admin-title"><ShieldCheck size={17} /> Panel Admin</span><span className="account-name">{name}</span><div className="admin-mobile-signout"><AdminSignOut /></div></header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}
