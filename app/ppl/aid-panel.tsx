"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { aidAllocationsSchema } from "@/lib/api-contracts";
import { officerAidCreateDialogPath, officerAidPath, officerAllocationPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { DashboardFormDialog } from "../_components/dashboard-form-dialog";
import { DashboardSkeleton, DashboardState } from "../_components/dashboard-state";
import { DataTable } from "../_components/data-table";
import { ActionIcon } from "../_components/action-icon";
import { Pagination } from "../_components/pagination";
import { AidCreateForm } from "./aid-route-form";
import { useOfficerData } from "./use-ppl-dashboard";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

const number = new Intl.NumberFormat("id-ID");

export function AidPanel() {
  const search = useSearchParams();
  const rawDialog = search.get("dialog");
  const dialog = rawDialog === "create" ? "create" : null;
  const rawPage = search.get("page");
  const page = parsePageIndex(rawPage);
  const { data, issue, retry, loading } = useOfficerData(`ppl/aid-allocations?page=${page}`, aidAllocationsSchema);
  const currentPage =
    data?.totalPages === undefined ? page : data.totalPages > 0 ? Math.min(page, data.totalPages - 1) : 0;

  useEffect(() => {
    normalizeBrowserPage("page", rawPage, page);
  }, [page, rawPage]);

  useEffect(() => {
    if (data) normalizeBrowserPage("page", rawPage, currentPage);
  }, [currentPage, data, rawPage]);

  useEffect(() => {
    if (rawDialog && !dialog) patchBrowserQuery({ dialog: null }, "replace");
  }, [dialog, rawDialog]);

  function changeDialog(open: boolean) {
    patchBrowserQuery({ dialog: open ? "create" : null }, open ? "push" : "replace");
  }

  return (
    <>
      <div className={tw("page-heading")}>
        <div>
          <h1>Alokasi bantuan</h1>
          <p>Pantau alokasi dan penyaluran per kecamatan.</p>
        </div>
        <DashboardFormDialog
          open={dialog === "create"}
          onOpenChange={changeDialog}
          trigger={
            <button type="button" className={tw("primary")}>
              Buat alokasi
            </button>
          }
          title="Buat alokasi"
          description="Catat barang bantuan dan jumlah yang dialokasikan ke kecamatan."
        >
          <AidCreateForm
            onSaved={() => {
              retry();
              changeDialog(false);
            }}
          />
        </DashboardFormDialog>
      </div>
      <section className={tw("panel")}>
        {issue && (
          <DashboardState
            compact
            kind="error"
            title="Data belum dapat diperbarui"
            description={issue}
            action={
              <button className={tw("secondary")} onClick={retry}>
                Coba lagi
              </button>
            }
          />
        )}
        {data?.allocations.length ? (
          <DataTable
            label="Daftar alokasi"
            columns={[
              "Barang",
              "Kecamatan",
              { label: "Alokasi", numeric: true },
              { label: "Disalurkan", numeric: true },
              { label: "Sisa", numeric: true },
              "Status",
              "Catatan",
              "Aksi",
            ]}
            busy={loading}
          >
            {data.allocations.map((allocation) => {
              const remaining = allocation.quantity - allocation.deliveredQuantity;
              const status =
                remaining === 0 ? "Selesai" : allocation.deliveredQuantity ? "Penyaluran sebagian" : "Direncanakan";
              return (
                <tr key={allocation.id}>
                  <td>
                    <strong>{allocation.item}</strong>
                  </td>
                  <td>{allocation.districtName}</td>
                  <td className="dashboard-table-number">
                    {number.format(allocation.quantity)} {allocation.unit}
                  </td>
                  <td className="dashboard-table-number">
                    {number.format(allocation.deliveredQuantity)} {allocation.unit}
                  </td>
                  <td className="dashboard-table-number">
                    {number.format(remaining)} {allocation.unit}
                  </td>
                  <td>
                    <span className={tw("tag")}>{status}</span>
                  </td>
                  <td>{allocation.note || "—"}</td>
                  <td>
                    <ActionIcon
                      href={officerAllocationPath(allocation.id)}
                      label="Lihat penyaluran"
                      icon="eye"
                    />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : loading ? (
          <DashboardSkeleton kind="table" columns={8} label="Memuat alokasi…" />
        ) : (
          !issue && (
            <DashboardState
              title="Belum ada alokasi bantuan"
              description="Alokasi yang dibuat petugas akan muncul di sini."
            />
          )
        )}
        <Pagination
          label="Halaman alokasi bantuan"
          page={currentPage}
          hasNext={data?.hasMore ?? false}
          totalPages={data?.totalPages}
          busy={loading}
          onPage={(next) => patchBrowserQuery({ page: pageQueryValue(next) })}
        />
      </section>
    </>
  );
}
