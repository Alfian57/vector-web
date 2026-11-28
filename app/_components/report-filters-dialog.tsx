"use client";

import { DashboardFormDialog } from "@/app/_components/dashboard-form-dialog";
import { findings, statuses } from "@/lib/domain";
import { tw } from "@/lib/tw";
import { Filter } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ReportFilters } from "./report-filters";

export function ReportFiltersDialog({
  filters,
  onApply,
  disabled = false,
}: {
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const activeFilterCount = Number(Boolean(filters.finding)) + Number(Boolean(filters.status));
  const draftFilterCount = Number(Boolean(draft.finding)) + Number(Boolean(draft.status));

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setDraft(filters);
    setOpen(nextOpen);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draft);
    setOpen(false);
  }

  return (
    <DashboardFormDialog
      open={open}
      onOpenChange={changeOpen}
      trigger={
        <button type="button" className={tw("secondary dashboard-filter-trigger")} disabled={disabled}>
          <Filter size={16} aria-hidden="true" />
          Filter
          {activeFilterCount > 0 && <span className="dashboard-filter-count">{activeFilterCount}</span>}
        </button>
      }
      title="Filter laporan"
      description="Tampilkan laporan menurut temuan atau status verifikasi."
    >
      <form className="dashboard-admin-filter-form" aria-label="Filter laporan" onSubmit={submit}>
        <div className="dashboard-admin-filter-fields dashboard-report-filter-fields">
          <label>
            Temuan <span>(opsional)</span>
            <select
              value={draft.finding}
              onChange={(event) => setDraft((current) => ({ ...current, finding: event.target.value }))}
            >
              <option value="">Semua temuan</option>
              {Object.entries(findings).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status <span>(opsional)</span>
            <select
              value={draft.status}
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">Semua status</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="dashboard-admin-filter-actions">
          <button
            type="button"
            className={tw("secondary")}
            disabled={draftFilterCount === 0}
            onClick={() => setDraft({ status: "", finding: "" })}
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
