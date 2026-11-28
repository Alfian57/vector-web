"use client";

import { BookOpen, ScrollText, Users } from "lucide-react";
import { useState } from "react";
import { DashboardSearchDialog, DashboardSearchGroup } from "@/app/_components/dashboard-search-dialog";
import { DashboardSearchResult } from "@/app/_components/dashboard-search-result";
import { DashboardSkeleton, DashboardState } from "@/app/_components/dashboard-state";
import { adminAccountManagePath, adminArticleEditPath, adminLogsPath } from "@/lib/routes";
import { adminItems } from "./navigation";
import { useAdminSearch } from "./use-admin-search";

const articleStatus = { published: "Terbit", archived: "Arsip", draft: "Draf" };
const roles = { admin: "Admin", officer: "Petugas PPL", farmer: "Petani" };

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading, issue, retry } = useAdminSearch(open, query);
  const term = query.trim().toLocaleLowerCase("id-ID");
  const menus = adminItems.filter((item) => `${item.label} ${item.keywords}`.toLocaleLowerCase("id-ID").includes(term));
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }
  const close = () => changeOpen(false);

  return (
    <DashboardSearchDialog
      title="Pencarian global Admin"
      triggerLabel="Cari menu atau data"
      open={open}
      query={query}
      onOpenChange={changeOpen}
      onQueryChange={setQuery}
    >
      {!!menus.length && (
        <DashboardSearchGroup title="Menu">
          {menus.map((item) => (
            <li key={item.href}>
              <DashboardSearchResult item={{ ...item, description: "Buka menu" }} onActivate={close} />
            </li>
          ))}
        </DashboardSearchGroup>
      )}
      {!!results.accounts.length && (
        <DashboardSearchGroup title="Akun">
          {results.accounts.map((account) => (
            <li key={account.id}>
              <DashboardSearchResult
                item={{
                  href: adminAccountManagePath(account.id),
                  label: account.name,
                  icon: Users,
                  description: `${account.email} · ${roles[account.role]}${account.banned ? " · Dinonaktifkan" : ""}`,
                }}
                onActivate={close}
              />
            </li>
          ))}
        </DashboardSearchGroup>
      )}
      {!!results.education.length && (
        <DashboardSearchGroup title="Artikel edukasi">
          {results.education.map((article) => (
            <li key={article.id}>
              <DashboardSearchResult
                item={{
                  href: adminArticleEditPath(article.id),
                  label: article.title,
                  icon: BookOpen,
                  description: `${article.category} · ${articleStatus[article.status]}`,
                }}
                onActivate={close}
              />
            </li>
          ))}
        </DashboardSearchGroup>
      )}
      {!!results.logs.length && (
        <DashboardSearchGroup title="Log aktivitas">
          {results.logs.map((log) => (
            <li key={log.id}>
              <DashboardSearchResult
                item={{
                  href: `${adminLogsPath}?q=${encodeURIComponent(log.action)}`,
                  label: log.summary,
                  icon: ScrollText,
                  description: `${log.action} · ${log.category}`,
                }}
                onActivate={close}
              />
            </li>
          ))}
        </DashboardSearchGroup>
      )}
      {term.length < 2 && (
        <p className="dashboard-search-hint">Ketik sedikitnya 2 karakter untuk mencari akun, artikel, dan log.</p>
      )}
      {loading && <DashboardSkeleton label="Mencari data…" kind="list" rows={2} />}
      {issue && (
        <DashboardState
          compact
          kind="error"
          title="Pencarian data belum tersedia"
          description={issue}
          action={
            <button className="dashboard-inline-link" onClick={retry}>
              Coba lagi
            </button>
          }
        />
      )}
      {term.length >= 2 &&
        !loading &&
        !issue &&
        !menus.length &&
        !results.accounts.length &&
        !results.education.length &&
        !results.logs.length && (
          <DashboardState kind="filtered" title="Tidak ada hasil" description="Coba kata kunci yang lain." compact />
        )}
    </DashboardSearchDialog>
  );
}
