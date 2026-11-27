import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, ShieldCheck } from "lucide-react";
import { Brand } from "@/app/_components/brand";
import { AccountMenu } from "@/app/_components/account-menu";
import type { Account } from "@/lib/domain";
import { educationPath, homePath } from "@/lib/routes";
import { AdminGlobalSearch } from "./global-search";
import { AdminNavigation } from "./navigation";
import { tw } from "@/lib/tw";

export function AdminShell({ account, children }: { account: Account; children: ReactNode }) {
  return (
    <div className={tw("admin-layout")}>
      <aside className={tw("admin-sidebar")}>
        <Brand />
        <p className={tw("admin-side-label")}>PENGELOLAAN</p>
        <AdminNavigation />
        <div className={tw("admin-side-bottom")}>
          <Link href={educationPath}>
            <BookOpen size={18} />
            Lihat edukasi
          </Link>
          <Link href={homePath}>
            <ShieldCheck size={18} />
            Kembali ke beranda
          </Link>
        </div>
      </aside>
      <div className={tw("admin-main")}>
        <header className={tw("admin-topbar")}>
          <div className={tw("admin-mobile-brand")}>
            <Brand />
          </div>
          <AdminGlobalSearch />
          <AccountMenu account={account} />
        </header>
        <main className={tw("admin-content")}>{children}</main>
      </div>
    </div>
  );
}
