"use client";

import { DashboardFormDialog } from "@/app/_components/dashboard-form-dialog";
import { tw } from "@/lib/tw";
import { Filter } from "lucide-react";
import { useState, type FormEvent } from "react";

export type AccountFilters = {
  query: string;
  role: string;
  state: string;
};

export function AccountFiltersDialog({
  filters,
  onApply,
}: {
  filters: AccountFilters;
  onApply: (filters: AccountFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const activeFilterCount =
    Number(Boolean(filters.query.trim())) + Number(Boolean(filters.role)) + Number(Boolean(filters.state));

  function handleOpenChange(nextOpen: boolean) {
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
      onOpenChange={handleOpenChange}
      trigger={
        <button type="button" className={tw("secondary dashboard-filter-trigger")}>
          <Filter size={16} aria-hidden="true" />
          Filter
          {activeFilterCount > 0 && <span className="dashboard-filter-count">{activeFilterCount}</span>}
        </button>
      }
      title="Filter akun"
      description="Cari akun dan pilih peran atau status yang ingin ditampilkan."
    >
      <form className="dashboard-admin-filter-form" aria-label="Filter akun" onSubmit={submit}>
        <div className="dashboard-admin-filter-fields">
          <label>
            Cari akun <span>(opsional)</span>
            <input
              type="search"
              value={draft.query}
              onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
              placeholder="Nama, email, atau nomor WhatsApp"
            />
          </label>
          <label>
            Peran <span>(opsional)</span>
            <select
              value={draft.role}
              onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="">Semua peran</option>
              <option value="farmer">Petani</option>
              <option value="officer">Petugas PPL</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            Status <span>(opsional)</span>
            <select
              value={draft.state}
              onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))}
            >
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="banned">Dinonaktifkan</option>
            </select>
          </label>
        </div>
        <div className="dashboard-admin-filter-actions">
          <button
            type="button"
            className={tw("secondary")}
            disabled={!draft.query && !draft.role && !draft.state}
            onClick={() => setDraft({ query: "", role: "", state: "" })}
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
