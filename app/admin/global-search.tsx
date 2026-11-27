"use client";

import Link from "next/link";
import { BookOpen, Search, ScrollText, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminAccountsPath, adminEducationPath, adminLogsPath } from "@/lib/routes";
import { adminItems } from "./navigation";
import { useAdminSearch } from "./use-admin-search";
import { tw } from "@/lib/tw";

function roleLabel(role: string) {
  return role === "officer" ? "Petugas PPL" : role === "admin" ? "Admin" : "Petani";
}

function articleStatus(status: string) {
  return status === "published" ? "Terbit" : status === "archived" ? "Arsip" : "Draf";
}

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading, issue, clearIssue } = useAdminSearch(open, query);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogInputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

  const matchingMenus = useMemo(
    () =>
      adminItems.filter(
        ({ label, keywords }) =>
          !normalizedQuery || `${label} ${keywords}`.toLocaleLowerCase("id-ID").includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      dialogInputRef.current?.focus();
    }
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  function openDialog() {
    setQuery("");
    clearIssue();
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <div className={tw("admin-global-search-trigger")}>
        <Search size={17} aria-hidden="true" />
        <label className={tw("sr-only")} htmlFor="admin-search-trigger">
          Cari menu atau data <span>(opsional)</span>
        </label>
        <input
          id="admin-search-trigger"
          type="search"
          readOnly
          placeholder="Cari menu atau data…"
          aria-haspopup="dialog"
          aria-controls="admin-global-search-dialog"
          aria-keyshortcuts="Control+K Meta+K"
          onClick={openDialog}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openDialog();
            }
          }}
        />
        <kbd>Ctrl K</kbd>
      </div>
      <dialog
        id="admin-global-search-dialog"
        ref={dialogRef}
        className={tw("admin-search-dialog")}
        aria-label="Pencarian global Admin"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div className={tw("admin-search-panel")}>
          <div className={tw("admin-search-field")}>
            <Search size={19} aria-hidden="true" />
            <label className={tw("sr-only")} htmlFor="admin-search-query">
              Cari menu atau data <span>(opsional)</span>
            </label>
            <input
              ref={dialogInputRef}
              id="admin-search-query"
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, email, judul artikel, atau aktivitas…"
            />
            <kbd>Esc</kbd>
            <button
              type="button"
              className={tw("admin-search-close")}
              aria-label="Tutup pencarian"
              onClick={closeDialog}
            >
              <X size={18} />
            </button>
          </div>
          <div className={tw("admin-search-results")} aria-live="polite">
            {matchingMenus.length > 0 && (
              <section className={tw("admin-search-group")} aria-label="Menu">
                <h2>Menu</h2>
                <ul>
                  {matchingMenus.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link href={href} onClick={closeDialog}>
                        <span className={tw("admin-search-icon")}>
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className={tw("admin-search-copy")}>
                          <strong>{label}</strong>
                          <small>Buka menu</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {normalizedQuery.length < 2 && (
              <p className={tw("admin-search-hint")}>
                Ketik sedikitnya 2 karakter untuk mencari akun, artikel, dan log.
              </p>
            )}
            {loading && (
              <p className={tw("admin-search-hint")} role="status">
                Mencari data…
              </p>
            )}
            {issue && (
              <p className={tw("admin-search-error")} role="alert">
                {issue}
              </p>
            )}
            {normalizedQuery.length >= 2 && !loading && !issue && (
              <>
                {results.accounts.length > 0 && (
                  <section className={tw("admin-search-group")} aria-label="Akun">
                    <h2>
                      Akun <span>{results.accounts.length}</span>
                    </h2>
                    <ul>
                      {results.accounts.map((account) => (
                        <li key={account.id}>
                          <Link
                            href={`${adminAccountsPath}?q=${encodeURIComponent(account.email)}`}
                            onClick={closeDialog}
                          >
                            <span className={tw("admin-search-icon")}>
                              <Users size={17} aria-hidden="true" />
                            </span>
                            <span className={tw("admin-search-copy")}>
                              <strong>{account.name}</strong>
                              <small>
                                {account.email} · {roleLabel(account.role)}
                                {account.banned ? " · Dinonaktifkan" : ""}
                              </small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {results.education.length > 0 && (
                  <section className={tw("admin-search-group")} aria-label="Artikel edukasi">
                    <h2>
                      Artikel edukasi <span>{results.education.length}</span>
                    </h2>
                    <ul>
                      {results.education.map((article) => (
                        <li key={article.id}>
                          <Link
                            href={`${adminEducationPath}?article=${encodeURIComponent(article.id)}`}
                            onClick={closeDialog}
                          >
                            <span className={tw("admin-search-icon")}>
                              <BookOpen size={17} aria-hidden="true" />
                            </span>
                            <span className={tw("admin-search-copy")}>
                              <strong>{article.title}</strong>
                              <small>
                                {article.category} · {articleStatus(article.status)}
                              </small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {results.logs.length > 0 && (
                  <section className={tw("admin-search-group")} aria-label="Log aktivitas">
                    <h2>
                      Log aktivitas <span>{results.logs.length}</span>
                    </h2>
                    <ul>
                      {results.logs.map((log) => (
                        <li key={log.id}>
                          <Link href={`${adminLogsPath}?q=${encodeURIComponent(log.action)}`} onClick={closeDialog}>
                            <span className={tw("admin-search-icon")}>
                              <ScrollText size={17} aria-hidden="true" />
                            </span>
                            <span className={tw("admin-search-copy")}>
                              <strong>{log.summary}</strong>
                              <small>
                                {log.action} · {log.category} ·{" "}
                                {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
                                  new Date(log.createdAt),
                                )}
                              </small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {!matchingMenus.length &&
                  !results.accounts.length &&
                  !results.education.length &&
                  !results.logs.length && (
                    <p className={tw("admin-search-hint")}>
                      Tidak ada hasil. Coba nama, email, judul artikel, atau jenis aktivitas lain.
                    </p>
                  )}
              </>
            )}
          </div>
          <footer className={tw("admin-search-footer")}>
            <span>Pencarian dibatasi pada menu dan data yang dapat diakses Admin.</span>
            <span>
              Tekan <kbd>Esc</kbd> untuk menutup
            </span>
          </footer>
        </div>
      </dialog>
    </>
  );
}
