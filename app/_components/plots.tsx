"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import type { MapPackage } from "@/lib/domain";
import { dashboardPageSize } from "@/lib/pagination";
import type { OfflineMap } from "@/lib/pwa/storage";
import { tw } from "@/lib/tw";
import { ActionIcon } from "./action-icon";
import { DashboardConfirmation } from "./dashboard-confirmation";
import { DashboardFormDialog } from "./dashboard-form-dialog";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { DataTable } from "./data-table";
import { FieldLabel } from "./field-label";
import { LocationFields, type Coordinates } from "./location-fields";
import { Pagination } from "./pagination";
import { usePlots } from "./use-plots";
import { showToast } from "./toast";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

const blank: Coordinates = { longitude: "", latitude: "" };

export function Plots({ tiles, offlineMap }: { tiles?: MapPackage; offlineMap?: OfflineMap }) {
  const [selected, setSelected] = useState<{ id: string; name: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createFormInstance, setCreateFormInstance] = useState(0);
  const createFormInstanceRef = useRef(0);
  const search = useSearchParams();
  const rawPage = search.get("page");
  const page = parsePageIndex(rawPage);
  const { plots, busy, issue, removePlot, retryPlots, clearIssue } = usePlots();
  const totalPages = Math.ceil((plots?.length ?? 0) / dashboardPageSize);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;

  const changePage = useCallback((nextPage: number, replace = false) => {
    patchBrowserQuery({ page: pageQueryValue(nextPage) }, replace ? "replace" : "push");
  }, []);

  useEffect(() => {
    normalizeBrowserPage("page", rawPage, page);
  }, [page, rawPage]);

  useEffect(() => {
    if (plots) normalizeBrowserPage("page", rawPage, currentPage);
  }, [currentPage, plots, rawPage]);

  function setCreateDialogOpen(open: boolean) {
    setCreateOpen(open);
    if (open) {
      setCreateFormInstance((instance) => instance + 1);
      createFormInstanceRef.current += 1;
    }
  }

  const openCreateFromHash = useEffectEvent(() => {
    if (window.location.hash !== "#tambah-petak") return;
    setCreateDialogOpen(true);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
  });

  useEffect(() => {
    function onHashChange() {
      openCreateFromHash();
    }
    openCreateFromHash();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const formInstance = createFormInstance;

  return (
    <>
      <div className={tw("page-heading")}>
        <div>
          <h1>Petak pantauan</h1>
          <p>Terima peringatan untuk kecamatan tempat petak terdaftar.</p>
        </div>
        <DashboardFormDialog
          open={createOpen}
          onOpenChange={setCreateDialogOpen}
          trigger={
            <button type="button" className={tw("primary")}>
              <Plus size={17} aria-hidden="true" /> Tambah petak
            </button>
          }
          title="Tambah petak"
          description="Daftarkan lokasi sawah agar peringatan sesuai dengan wilayah Anda."
        >
          <PlotForm
            key={formInstance}
            tiles={tiles}
            offlineMap={offlineMap}
            onSaved={() => {
              if (formInstance === createFormInstanceRef.current) setCreateOpen(false);
              showToast("Petak pantauan tersimpan.");
              changePage(0, true);
              retryPlots();
            }}
          />
        </DashboardFormDialog>
      </div>
      <section className={tw("panel")} aria-label="Petak pantauan">
        {issue && !selected && (
          <DashboardState
            kind="error"
            title="Daftar petak belum dapat dimuat"
            description={issue}
            action={
              <button className={tw("secondary")} onClick={retryPlots}>
                Coba lagi
              </button>
            }
          />
        )}
        {plots?.length ? (
          <DataTable label="Petak pantauan" columns={["Nama petak", "Kecamatan", "Aksi"]} busy={busy}>
            {plots.slice(currentPage * dashboardPageSize, (currentPage + 1) * dashboardPageSize).map((plot) => (
              <tr key={plot.id}>
                <td>
                  <strong>{plot.name}</strong>
                </td>
                <td>{plot.districtName}</td>
                <td>
                  <ActionIcon
                    label="Hapus petak"
                    icon="trash"
                    onClick={() => {
                      clearIssue();
                      setSelected(plot);
                    }}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : plots ? (
          <DashboardState
            title="Belum ada petak pantauan"
            description="Tambahkan petak untuk menerima peringatan wilayah."
          />
        ) : (
          !issue && <DashboardSkeleton label="Memuat petak…" kind="table" columns={3} />
        )}
          <Pagination
          label="Halaman petak pantauan"
          page={currentPage}
          hasNext={currentPage < totalPages - 1}
          totalPages={totalPages}
          busy={busy}
          onPage={changePage}
        />
      </section>
      {selected && (
        <DashboardConfirmation
          title="Hapus petak?"
          description={`Peringatan baru tidak akan dikirim untuk ${selected.name}.`}
          busy={busy}
          issue={issue}
          confirmLabel="Hapus petak"
          pendingLabel="Menghapus…"
          onCancel={() => {
            clearIssue();
            setSelected(undefined);
          }}
          onConfirm={() => {
            const name = selected.name;
            void removePlot(selected.id, () => setSelected(undefined)).then((removed) => {
              if (removed) showToast(`Petak “${name}” dihapus.`);
            });
          }}
        />
      )}
    </>
  );
}

function PlotForm({
  tiles,
  offlineMap,
  onSaved,
}: {
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
  onSaved: () => void;
}) {
  const [coordinates, setCoordinates] = useState<Coordinates>(blank);
  const { busy, issue, addPlot } = usePlots(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await addPlot({
      name: String(form.get("name") ?? ""),
      longitude: Number(coordinates.longitude),
      latitude: Number(coordinates.latitude),
    });
    if (saved) onSaved();
  }

  return (
    <form className={tw("field-form")} onSubmit={submit}>
      <label>
        <FieldLabel required>Nama petak</FieldLabel>
        <input name="name" required maxLength={80} placeholder="Contoh: Petak utara" />
      </label>
      <LocationFields value={coordinates} onChange={setCoordinates} tiles={tiles} offlineMap={offlineMap} />
      {issue && (
        <p className={tw("error-text")} role="alert">
          {issue}
        </p>
      )}
      <button className={tw("primary")} disabled={busy}>
        {busy ? "Menyimpan…" : "Simpan petak"}
      </button>
    </form>
  );
}
