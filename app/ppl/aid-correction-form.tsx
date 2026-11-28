"use client";

import type { AidAllocation, District } from "@/lib/domain";
import { AidForm } from "./aid-form";
import { AllocationFields } from "./allocation-fields";
import { DeliveryFields } from "./delivery-fields";
import type { AidEdit } from "./aid-correction-types";

export function AidCorrectionForm({
  path,
  edit,
  allocation,
  districts,
  disabled,
  onCancel,
  onSaved,
}: {
  path: string;
  edit: AidEdit;
  allocation: AidAllocation;
  districts: District[];
  disabled: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const canceling = edit.target === "void-delivery";
  const correction =
    edit.target === "allocation"
      ? { target: edit.target, revision: edit.allocation.revision }
      : { target: edit.target, revision: edit.delivery.revision, deliveryId: edit.delivery.id };
  const note = edit.target === "allocation" ? edit.allocation.note : edit.delivery.note;

  return (
    <AidForm
      path={path}
      disabled={disabled}
      correction={correction}
      originalNote={note}
      onCancel={onCancel}
      onSaved={onSaved}
      button={
        canceling
          ? "Konfirmasi pembatalan penyaluran"
          : edit.target === "delivery"
            ? "Simpan koreksi penyaluran"
            : "Simpan koreksi alokasi"
      }
      success={
        canceling
          ? "Penyaluran dibatalkan."
          : edit.target === "delivery"
            ? "Koreksi penyaluran tersimpan."
            : "Koreksi alokasi tersimpan."
      }
    >
      {edit.target === "allocation" ? (
        <>
          <p>Kecamatan, barang, dan satuan dapat dikoreksi sebelum penyaluran pertama.</p>
          <AllocationFields
            districts={districts}
            allocation={edit.allocation}
            delivered={allocation.deliveredQuantity}
          />
        </>
      ) : canceling ? (
        <>
          <p>
            Penyaluran untuk <strong>{edit.delivery.recipient}</strong> akan ditandai batal. Jumlahnya kembali tersedia
            pada alokasi ini.
          </p>
        </>
      ) : (
        <>
          <p>Perbarui penerima, jumlah, atau catatan penyaluran dan jelaskan alasan koreksinya.</p>
          <DeliveryFields
            delivery={edit.delivery}
            max={allocation.quantity - allocation.deliveredQuantity + edit.delivery.quantity}
          />
        </>
      )}
    </AidForm>
  );
}
