"use client";

import type { AidAllocation, AidDelivery } from "@/lib/domain";
import { tw } from "@/lib/tw";
import { DashboardFormDialog } from "../_components/dashboard-form-dialog";
import { DashboardSkeleton, DashboardState } from "../_components/dashboard-state";
import { AidDeliveryForm, AidEditForm } from "./aid-route-form";

const allocationDialogs = ["allocation-edit", "delivery-create", "delivery-edit", "delivery-cancel"] as const;

export type AllocationDialog = (typeof allocationDialogs)[number];
export type AllocationNotice = "aid-corrected" | "delivery-saved" | "delivery-corrected" | "delivery-canceled";

export function isAllocationDialog(value: string | null): value is AllocationDialog {
  return allocationDialogs.includes(value as AllocationDialog);
}

export function isDeliveryDialog(dialog: AllocationDialog | null) {
  return dialog === "delivery-edit" || dialog === "delivery-cancel";
}

export function AllocationActionDialog({
  allocation,
  dialog,
  delivery,
  loading,
  issue,
  retry,
  onClose,
  onSaved,
}: {
  allocation: AidAllocation;
  dialog: AllocationDialog | null;
  delivery?: AidDelivery;
  loading: boolean;
  issue?: string;
  retry: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const title =
    dialog === "allocation-edit"
      ? "Koreksi alokasi"
      : dialog === "delivery-create"
        ? "Catat penyaluran"
        : dialog === "delivery-edit"
          ? "Koreksi penyaluran"
          : dialog === "delivery-cancel"
            ? "Batalkan penyaluran"
            : "Kelola alokasi";
  const description =
    dialog === "allocation-edit"
      ? "Perbarui data alokasi dan jelaskan alasan koreksinya."
      : dialog === "delivery-create"
        ? "Catat penerima dan jumlah bantuan yang disalurkan."
        : dialog === "delivery-edit"
          ? "Perbaiki informasi penyaluran dan catat alasannya."
          : dialog === "delivery-cancel"
            ? "Batalkan penyaluran dan jelaskan alasannya. Jumlahnya akan kembali ke sisa alokasi."
            : "Pilih tindakan untuk alokasi ini.";
  const edit =
    dialog === "allocation-edit"
      ? { target: "allocation" as const, allocation }
      : dialog === "delivery-edit" && delivery
        ? { target: "delivery" as const, delivery }
        : dialog === "delivery-cancel" && delivery
          ? { target: "void-delivery" as const, delivery }
          : undefined;

  return (
    <DashboardFormDialog
      open={dialog !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
    >
      {dialog === "allocation-edit" && edit ? (
        <AidEditForm
          allocation={allocation}
          edit={edit}
          onCancel={onClose}
          onSaved={onSaved}
        />
      ) : dialog === "delivery-create" ? (
        <AidDeliveryForm
          allocation={allocation}
          onCancel={onClose}
          onSaved={onSaved}
        />
      ) : edit && (dialog === "delivery-edit" || dialog === "delivery-cancel") ? (
        <AidEditForm
          allocation={allocation}
          edit={edit}
          onCancel={onClose}
          onSaved={onSaved}
        />
      ) : loading ? (
        <DashboardSkeleton kind="form" label="Memuat data penyaluran…" />
      ) : issue ? (
        <DashboardState
          kind="error"
          title="Data penyaluran belum dapat dibuka"
          description={issue}
          action={
            <button className={tw("secondary")} onClick={retry}>
              Coba lagi
            </button>
          }
        />
      ) : (
        <DashboardState
          kind="error"
          title="Penyaluran tidak ditemukan"
          description="Muat ulang riwayat untuk memilih penyaluran yang masih aktif."
        />
      )}
    </DashboardFormDialog>
  );
}
