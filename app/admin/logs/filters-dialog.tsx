"use client";

import { DashboardFormDialog } from "@/app/_components/dashboard-form-dialog";
import { tw } from "@/lib/tw";
import { Filter } from "lucide-react";
import { useState, type FormEvent } from "react";

export type LogFilters = {
  query: string;
  account: string;
  kind: string;
  category: string;
  from: string;
  to: string;
};

function countFilters(filters: LogFilters) {
  return (
    Number(Boolean(filters.query.trim())) +
    Number(Boolean(filters.account.trim())) +
    Number(Boolean(filters.kind)) +
    Number(Boolean(filters.category)) +
    Number(Boolean(filters.from)) +
    Number(Boolean(filters.to))
  );
}

export function LogFiltersDialog({
  filters,
  onApply,
}: {
  filters: LogFilters;
  onApply: (filters: LogFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const activeFilterCount = countFilters(filters);
  const draftFilterCount = countFilters(draft);

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setDraft(filters);
    setOpen(nextOpen);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({ ...draft, query: draft.query.trim() });
    setOpen(false);
  }

  return (
    <DashboardFormDialog
      open={open}
      onOpenChange={changeOpen}
      trigger={
        <button type="button" className={tw("secondary dashboard-filter-trigger")}>
          <Filter size={16} aria-hidden="true" />
          Filter
          {activeFilterCount > 0 && <span className="dashboard-filter-count">{activeFilterCount}</span>}
        </button>
      }
      title="Filter log aktivitas"
      description="Cari aktivitas berdasarkan akun, aksi, jenis, kategori, atau rentang tanggal."
    >
      <form className="dashboard-admin-filter-form" aria-label="Filter log aktivitas" onSubmit={submit}>
        <div className="dashboard-admin-filter-fields">
          <label>
            Cari log <span>(opsional)</span>
            <input
              type="search"
              value={draft.query}
              onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
              placeholder="Aksi, kategori, atau ringkasan"
            />
          </label>
          <label>
            Akun <span>(opsional)</span>
            <input
              type="search"
              value={draft.account}
              onChange={(event) => setDraft((current) => ({ ...current, account: event.target.value }))}
              placeholder="Nama atau email akun"
            />
          </label>
          <label>
            Jenis <span>(opsional)</span>
            <select
              value={draft.kind}
              onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))}
            >
              <option value="">Semua jenis</option>
              <option value="audit">Aktivitas pengguna</option>
              <option value="system">Status sistem</option>
            </select>
          </label>
          <label>
            Kategori <span>(opsional)</span>
            <select
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">Semua kategori</option>
              <option value="account">Akun</option>
              <option value="education">Edukasi</option>
              <option value="page">Halaman</option>
              <option value="worker">Worker</option>
              <option value="auth">Autentikasi</option>
              <option value="api">API</option>
            </select>
          </label>
          <label>
            Dari tanggal <span>(opsional)</span>
            <input
              type="date"
              value={draft.from}
              onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
            />
          </label>
          <label>
            Sampai tanggal <span>(opsional)</span>
            <input
              type="date"
              value={draft.to}
              onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
        </div>
        <div className="dashboard-admin-filter-actions">
          <button
            type="button"
            className={tw("secondary")}
            disabled={draftFilterCount === 0}
            onClick={() => setDraft({ query: "", account: "", kind: "", category: "", from: "", to: "" })}
          >
            Hapus pilihan
          </button>
          <div className="dashboard-admin-filter-buttons">
            <button type="button" className={tw("secondary")} onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className={tw("primary")}>
              Terapkan filter
            </button>
          </div>
        </div>
      </form>
    </DashboardFormDialog>
  );
}
