"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { formatDate, type FollowUp, type FollowUpEntry } from "@/lib/domain";
import { followUpEntrySchema, followUpSchema, pageSchema } from "@/lib/api-contracts";
import { officerFollowUpsPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { DashboardSkeleton, DashboardState } from "../_components/dashboard-state";
import { DashboardFormDialog } from "../_components/dashboard-form-dialog";
import { DataTable } from "../_components/data-table";
import { Pagination } from "../_components/pagination";
import { FollowUpForm } from "./follow-up-form";
import { StaffHistory } from "./staff-history";
import { useOfficerData } from "./use-ppl-dashboard";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

const followUpsSchema = pageSchema(followUpSchema);
const columns = ["Kecamatan", "Jenis", "Status", "Catatan", "Waktu"];

function FollowUpCells({ entry }: { entry: FollowUp }) {
  return (
    <>
      <td>
        <strong>{entry.districtName}</strong>
      </td>
      <td>{entry.kind === "outreach" ? "Penyuluhan" : "Bantuan"}</td>
      <td>
        <span className={tw("tag")}>{entry.status === "planned" ? "Direncanakan" : "Selesai"}</span>
      </td>
      <td>{entry.note}</td>
      <td>{formatDate(entry.updatedAt)} WIB</td>
    </>
  );
}

export function ActionsPanel() {
  const search = useSearchParams();
  const rawDialog = search.get("dialog");
  const dialog = rawDialog === "broadcast" || rawDialog === "follow-up" ? rawDialog : null;
  const rawPage = search.get("page");
  const page = parsePageIndex(rawPage);
  const { data, issue, retry, loading } = useOfficerData(`ppl/follow-ups?page=${page}`, followUpsSchema);
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

  function changeDialog(next: "broadcast" | "follow-up" | null) {
    patchBrowserQuery({ dialog: next }, next ? "push" : "replace");
  }

  return (
    <>
      <div className={tw("page-heading")}>
        <div>
          <h1>Siaran dan tindak lanjut</h1>
          <p>Penyuluhan dan bantuan yang dicatat per kecamatan.</p>
        </div>
        <div className={tw("button-row")}>
          <DashboardFormDialog
            open={dialog === "broadcast"}
            onOpenChange={(open) => changeDialog(open ? "broadcast" : null)}
            trigger={
              <button type="button" className={tw("secondary")}>
                Kirim siaran
              </button>
            }
            title="Kirim siaran"
            description="Pilih kecamatan dan tulis informasi yang ingin diterima petani."
          >
            <FollowUpForm broadcast onSaved={retry} />
          </DashboardFormDialog>
          <DashboardFormDialog
            open={dialog === "follow-up"}
            onOpenChange={(open) => changeDialog(open ? "follow-up" : null)}
            trigger={
              <button type="button" className={tw("primary")}>
                Catat tindak lanjut
              </button>
            }
            title="Catat tindak lanjut"
            description="Catat penyuluhan atau bantuan untuk kecamatan."
          >
            <FollowUpForm onSaved={retry} />
          </DashboardFormDialog>
        </div>
      </div>
      <section className="dashboard-table-section" aria-label="Tindak lanjut per kecamatan">
        <header className="dashboard-table-heading">
          <h2>Tindak lanjut per kecamatan</h2>
        </header>
        <div className={tw("panel")}>
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
          {data?.entries.length ? (
            <DataTable label="Tindak lanjut per kecamatan" columns={columns} busy={loading}>
              {data.entries.map((entry) => (
                <tr key={`${entry.districtId}-${entry.kind}`}>
                  <FollowUpCells entry={entry} />
                </tr>
              ))}
            </DataTable>
          ) : loading ? (
            <DashboardSkeleton kind="table" columns={columns.length} label="Memuat tindak lanjut…" />
          ) : (
            !issue && (
              <DashboardState
                title="Belum ada tindak lanjut"
                description="Catatan penyuluhan dan bantuan akan muncul di sini."
              />
            )
          )}
          <Pagination
            label="Halaman tindak lanjut per kecamatan"
            page={currentPage}
            hasNext={data?.hasMore ?? false}
            totalPages={data?.totalPages}
            busy={loading}
            onPage={(nextPage) => patchBrowserQuery({ page: pageQueryValue(nextPage) })}
          />
        </div>
      </section>
      <StaffHistory<FollowUpEntry>
        title="Riwayat tindak lanjut"
        path="ppl/follow-ups/history"
        pageParam="historyPage"
        schema={followUpEntrySchema}
        entryKey={(entry) => entry.id}
        columns={[...columns, "Petugas"]}
        renderEntry={(entry) => (
          <>
            <FollowUpCells entry={entry} />
            <td>{entry.author}</td>
          </>
        )}
      />
    </>
  );
}
