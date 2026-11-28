"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { aidHistorySchema } from "@/lib/api-contracts";
import { formatDate, type AidAllocation } from "@/lib/domain";
import { officerAidPath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { DashboardSkeleton, DashboardState } from "../_components/dashboard-state";
import { DataTable } from "../_components/data-table";
import { ActionIcon } from "../_components/action-icon";
import { Pagination } from "../_components/pagination";
import { showToast } from "../_components/toast";
import {
  AllocationActionDialog,
  isAllocationDialog,
  isDeliveryDialog,
  type AllocationDialog,
  type AllocationNotice,
} from "./allocation-action-dialog";
import { AidCorrectionHistory } from "./aid-correction-history";
import { useOfficerData, useRefreshOfficerPage } from "./use-ppl-dashboard";
import { normalizeBrowserPage, pageQueryValue, parsePageIndex, patchBrowserQuery } from "@/lib/query-state";

const number = new Intl.NumberFormat("id-ID");
const allocationNoticeMessages: Record<AllocationNotice, string> = {
  "aid-corrected": "Koreksi bantuan tersimpan.",
  "delivery-saved": "Penyaluran tersimpan.",
  "delivery-corrected": "Koreksi penyaluran tersimpan.",
  "delivery-canceled": "Penyaluran dibatalkan.",
};

function isAllocationNotice(value: string | null): value is AllocationNotice {
  return (
    value === "aid-corrected" ||
    value === "delivery-saved" ||
    value === "delivery-corrected" ||
    value === "delivery-canceled"
  );
}

export function AllocationHistory({ allocation }: { allocation: AidAllocation }) {
  const search = useSearchParams();
  const router = useRouter();
  const rawPage = search.get("page");
  const rawDialog = search.get("dialog");
  const dialog = isAllocationDialog(rawDialog) ? rawDialog : null;
  const deliveryId = search.get("deliveryId");
  const page = parsePageIndex(rawPage);
  const notice = search.get("notice");
  const lastAnnouncedNotice = useRef<string | null>(null);
  useRefreshOfficerPage();
  const deliveryPath = `ppl/aid-allocations/${allocation.id}`;
  const { data, issue, retry, loading } = useOfficerData(`${deliveryPath}?page=${page}`, aidHistorySchema);
  const selectedDelivery = data?.deliveries.find((delivery) => delivery.id === deliveryId && !delivery.voided);
  const currentPage =
    data?.totalPages === undefined ? page : data.totalPages > 0 ? Math.min(page, data.totalPages - 1) : 0;
  useEffect(() => {
    normalizeBrowserPage("page", rawPage, page);
  }, [page, rawPage]);
  useEffect(() => {
    if (data) normalizeBrowserPage("page", rawPage, currentPage);
  }, [currentPage, data, rawPage]);
  useEffect(() => {
    if (rawDialog && !dialog) patchBrowserQuery({ dialog: null, deliveryId: null }, "replace");
  }, [dialog, rawDialog]);
  useEffect(() => {
    if (data && isDeliveryDialog(dialog) && !selectedDelivery)
      patchBrowserQuery({ dialog: null, deliveryId: null }, "replace");
  }, [data, dialog, selectedDelivery]);
  useEffect(() => {
    if (!isAllocationNotice(notice)) {
      lastAnnouncedNotice.current = null;
      return;
    }
    if (lastAnnouncedNotice.current === notice) return;
    lastAnnouncedNotice.current = notice;
    showToast(allocationNoticeMessages[notice]);
    patchBrowserQuery({ notice: null }, "replace");
  }, [notice]);
  const remaining = allocation.quantity - allocation.deliveredQuantity;
  const status = remaining === 0 ? "Selesai" : allocation.deliveredQuantity ? "Penyaluran sebagian" : "Direncanakan";

  function openDialog(next: AllocationDialog, selectedId?: string) {
    patchBrowserQuery({ dialog: next, deliveryId: selectedId ?? null, notice: null });
  }

  function closeDialog() {
    patchBrowserQuery({ dialog: null, deliveryId: null, notice: null }, "replace");
  }

  function finishDialog() {
    closeDialog();
    retry();
    router.refresh();
  }

  return (
    <>
      <Link href={officerAidPath} className={tw("text-link")}>
        Kembali ke alokasi bantuan
      </Link>
      <div className={tw("page-heading")}>
        <div>
          <h1>{allocation.item}</h1>
          <p>
            {allocation.districtName} · Sisa {number.format(remaining)} {allocation.unit}
          </p>
          <p>
            <span className={tw("tag")}>{status}</span>
          </p>
          {allocation.note && <p>{allocation.note}</p>}
        </div>
        <div className={tw("button-row")}>
          <button type="button" className={tw("secondary")} onClick={() => openDialog("allocation-edit")}>
            Koreksi alokasi
          </button>
          {remaining > 0 && (
            <button type="button" className={tw("primary")} onClick={() => openDialog("delivery-create")}>
              Catat penyaluran
            </button>
          )}
        </div>
      </div>
      {!remaining && (
        <p className={tw("panel-note")} role="status">
          Seluruh alokasi sudah disalurkan.
        </p>
      )}
      <section className="dashboard-table-section" aria-label="Riwayat penyaluran">
        <header className="dashboard-table-heading">
          <h2>Riwayat penyaluran</h2>
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
          {data?.deliveries.length ? (
            <DataTable
              label="Riwayat penyaluran"
              columns={["Penerima", { label: "Jumlah", numeric: true }, "Waktu", "Status", "Catatan", "Aksi"]}
              busy={loading}
            >
              {data.deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td>
                    <strong>{delivery.recipient}</strong>
                  </td>
                  <td className="dashboard-table-number">
                    {number.format(delivery.quantity)} {allocation.unit}
                  </td>
                  <td>{formatDate(delivery.recordedAt)} WIB</td>
                  <td>
                    <span className={tw(`tag ${delivery.voided ? "tag-rejected" : "tag-verified"}`)}>
                      {delivery.voided ? "Dibatalkan" : "Disalurkan"}
                    </span>
                  </td>
                  <td>{delivery.note || "—"}</td>
                  <td>
                    {!delivery.voided && (
                      <div className="dashboard-action-group">
                        <ActionIcon
                          onClick={() => openDialog("delivery-edit", delivery.id)}
                          label="Koreksi penyaluran"
                          icon="pencil"
                        />
                        <ActionIcon
                          onClick={() => openDialog("delivery-cancel", delivery.id)}
                          label="Batalkan penyaluran"
                          icon="ban"
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : loading ? (
            <DashboardSkeleton kind="table" columns={6} label="Memuat penyaluran…" />
          ) : (
            !issue && (
              <DashboardState
                title="Belum ada penyaluran."
                description="Catat penyaluran untuk memperbarui sisa alokasi."
              />
            )
          )}
          <Pagination
            label="Halaman riwayat penyaluran"
            page={currentPage}
            hasNext={data?.hasMore ?? false}
            totalPages={data?.totalPages}
            busy={loading}
            onPage={(nextPage) => patchBrowserQuery({ page: pageQueryValue(nextPage) })}
          />
        </div>
      </section>
      <AidCorrectionHistory path={deliveryPath} />
      <AllocationActionDialog
        allocation={allocation}
        dialog={dialog}
        delivery={selectedDelivery}
        loading={loading}
        issue={issue}
        retry={retry}
        onClose={() => closeDialog()}
        onSaved={finishDialog}
      />
    </>
  );
}
