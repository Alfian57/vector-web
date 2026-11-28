"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, ClipboardList, MapPin, Radar } from "lucide-react";
import {
  adminPath,
  educationPath,
  officerPath,
  radarPath,
  radarPlotsPath,
  radarReportsPath,
} from "@/lib/routes";
import type { Account } from "@/lib/domain";
import { AdminGlobalSearch } from "@/app/admin/global-search";
import { adminItems } from "@/app/admin/navigation";
import { officerItems, officerSearchItems } from "@/app/ppl/search-items";
import { AccountMenu } from "./account-menu";
import { NotificationMenu } from "./alerts";
import { DashboardGlobalSearch } from "./dashboard-global-search";
import { DashboardNavigation } from "./dashboard-navigation";
import { DashboardShell } from "./dashboard-shell";
import { radarSearchItems } from "./radar-search-items";

const radarItems = [
  { href: radarPath, label: "Radar", group: "Pemantauan", icon: Radar },
  { href: radarPlotsPath, label: "Petak", group: "Pemantauan", icon: MapPin },
  { href: radarReportsPath, label: "Laporan", group: "Kegiatan", icon: ClipboardList },
] as const;

const workspaces = {
  radar: { root: radarPath, label: "Navigasi utama", items: radarItems },
  officer: { root: officerPath, label: "Navigasi PPL", items: officerItems },
  admin: { root: adminPath, label: "Navigasi admin", items: adminItems },
};

function WorkspaceLinks({ workspace }: { workspace: keyof typeof workspaces }) {
  return (
    <div className="dashboard-workspace-links">
      <Link href={educationPath}>
        <BookOpen size={18} /> {workspace === "admin" ? "Lihat edukasi" : "Pusat edukasi"}
      </Link>
    </div>
  );
}

export function DashboardWorkspace({
  account,
  workspace = account.role === "farmer" ? "radar" : account.role,
  status,
  whatsappHref,
  beforeSignOut,
  afterSignOut,
  children,
}: {
  account: Account;
  workspace?: keyof typeof workspaces;
  status?: ReactNode;
  whatsappHref?: string;
  beforeSignOut?: () => Promise<void>;
  afterSignOut?: () => Promise<void>;
  children: ReactNode;
}) {
  const nav = workspaces[workspace];
  const links = <WorkspaceLinks workspace={workspace} />;
  return (
    <DashboardShell
      navigation={<DashboardNavigation {...nav} documentLinks={workspace === "radar"} />}
      links={links}
      search={
        account.role === "admin" ? (
          <AdminGlobalSearch />
        ) : (
          <DashboardGlobalSearch
            items={workspace === "officer" ? officerSearchItems : radarSearchItems(account.role)}
          />
        )
      }
      controls={
        <>
          {status}
          {workspace === "radar" && account.role === "farmer" && <NotificationMenu key={account.id} />}
          <AccountMenu
            account={account}
            beforeSignOut={beforeSignOut}
            afterSignOut={afterSignOut}
            whatsappHref={whatsappHref}
            mobileLinks={links}
          />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
