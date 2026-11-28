"use client";

import { DashboardFormDialog } from "@/app/_components/dashboard-form-dialog";
import type { EducationStatus } from "@/lib/domain";
import { tw } from "@/lib/tw";
import { Filter } from "lucide-react";
import { useState, type FormEvent } from "react";

type ArticleStatus = "" | EducationStatus;

const statuses: Record<Exclude<ArticleStatus, "">, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

export function EducationFiltersDialog({
  status,
  onApply,
}: {
  status: ArticleStatus;
  onApply: (status: ArticleStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(status);

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setDraftStatus(status);
    setOpen(nextOpen);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draftStatus);
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
          {status && <span className="dashboard-filter-count">1</span>}
        </button>
      }
      title="Filter artikel"
      description="Pilih status artikel yang ingin ditampilkan."
    >
      <form
        className="dashboard-admin-filter-form"
        aria-label="Filter artikel edukasi"
        onSubmit={submit}
      >
        <div className="dashboard-admin-filter-fields dashboard-admin-filter-fields--single">
          <label>
            Status <span>(opsional)</span>
            <select
              name="status"
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value as ArticleStatus)}
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
            disabled={!draftStatus}
            onClick={() => setDraftStatus("")}
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
