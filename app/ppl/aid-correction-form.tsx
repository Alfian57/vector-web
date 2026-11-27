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
  onCancel,
  onSaved,
}: {
  path: string;
  edit: AidEdit;
  allocation: AidAllocation;
  districts: District[];
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
      correction={correction}
      originalNote={note}
      onCancel={onCancel}
      onSaved={onSaved}
      button={canceling ? "Konfirmasi pembatalan penyaluran" : "Simpan koreksi bantuan"}
      success="Koreksi bantuan tersimpan."
    >
      {edit.target === "allocation" ? (
        <>
          <h4>Koreksi alokasi</h4>
          <p>Kecamatan, barang, dan satuan dapat dikoreksi sebelum penyaluran pertama.</p>
          <AllocationFields
            districts={districts}
            allocation={edit.allocation}
            delivered={allocation.deliveredQuantity}
          />
        </>
      ) : canceling ? (
        <>
          <h4>Batalkan penyaluran</h4>
          <p>
            Penyaluran untuk <strong>{edit.delivery.recipient}</strong> akan ditandai batal. Jumlahnya kembali tersedia
            pada alokasi ini.
          </p>
        </>
      ) : (
        <>
          <h4>Koreksi penyaluran</h4>
          <DeliveryFields
            delivery={edit.delivery}
            max={allocation.quantity - allocation.deliveredQuantity + edit.delivery.quantity}
          />
        </>
      )}
    </AidForm>
  );
}
