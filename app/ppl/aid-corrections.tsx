"use client";

import { formatDate, type AidAllocation, type AidCorrection, type AidDelivery, type District } from "@/lib/domain";
import { FieldLabel } from "../_components/field-label";
import { AidForm, AidQuantity } from "./aid-form";
import { StaffHistory } from "./history";

export type AidEdit = { target: "allocation"; allocation: AidAllocation } | {
  target: "delivery" | "void-delivery"; delivery: AidDelivery;
};

export function AllocationFields({ districts, allocation, delivered = 0 }: {
  districts: District[];
  allocation?: AidAllocation;
  delivered?: number;
}) {
  return <>
    <label><FieldLabel required>Kecamatan penerima</FieldLabel><select name="districtId" defaultValue={allocation?.districtId ?? ""} required>
      <option value="" disabled>Pilih kecamatan</option>
      {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
    </select></label>
    <label><FieldLabel required>Nama barang</FieldLabel><input name="item" defaultValue={allocation?.item} placeholder="Contoh: Perangkap kuning" maxLength={100} required /></label>
    <div className="form-two">
      <AidQuantity min={Math.max(1, delivered)} value={allocation?.quantity} />
      <label><FieldLabel required>Satuan</FieldLabel><input name="unit" defaultValue={allocation?.unit} placeholder="Contoh: lembar" required maxLength={30} /></label>
    </div>
  </>;
}

export function DeliveryFields({ max, delivery }: { max: number; delivery?: AidDelivery }) {
  return <div className="form-two">
    <label><FieldLabel required>Kelompok penerima</FieldLabel>
      <input name="recipient" defaultValue={delivery?.recipient} placeholder="Contoh: Kelompok Tani Mekar" required maxLength={100} /></label>
    <AidQuantity delivery max={max} value={delivery?.quantity} />
  </div>;
}

export function AidCorrectionForm({ path, edit, allocation, districts, onCancel, onSaved }: {
  path: string;
  edit: AidEdit;
  allocation: AidAllocation;
  districts: District[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const canceling = edit.target === "void-delivery";
  const correction = edit.target === "allocation"
    ? { target: edit.target, revision: edit.allocation.revision }
    : { target: edit.target, revision: edit.delivery.revision, deliveryId: edit.delivery.id };
  const note = edit.target === "allocation" ? edit.allocation.note : edit.delivery.note;
  return <AidForm path={path} correction={correction} originalNote={note} onCancel={onCancel} onSaved={onSaved}
    button={canceling ? "Konfirmasi pembatalan penyaluran" : "Simpan koreksi bantuan"} success="Koreksi bantuan tersimpan.">
    {edit.target === "allocation" ? <>
      <h4>Koreksi alokasi</h4>
      <p>Kecamatan, barang, dan satuan dapat dikoreksi sebelum penyaluran pertama.</p>
      <AllocationFields districts={districts} allocation={edit.allocation} delivered={allocation.deliveredQuantity} />
    </> : canceling ? <>
      <h4>Batalkan penyaluran</h4>
      <p>Penyaluran untuk <strong>{edit.delivery.recipient}</strong> akan ditandai batal. Jumlahnya kembali tersedia pada alokasi ini.</p>
    </> : <>
      <h4>Koreksi penyaluran</h4>
      <DeliveryFields delivery={edit.delivery} max={allocation.quantity - allocation.deliveredQuantity + edit.delivery.quantity} />
    </>}
  </AidForm>;
}

const labels = { allocation: "Koreksi alokasi", delivery: "Koreksi penyaluran", "void-delivery": "Pembatalan penyaluran" };

function describe(value: AidCorrection["current"]) {
  const description = "districtName" in value
    ? `${value.districtName} · ${value.item} · ${value.quantity} ${value.unit}`
    : `${value.recipient} · ${value.quantity}${value.voided ? " · dibatalkan" : ""}`;
  return value.note ? `${description} · ${value.note}` : description;
}

export function AidCorrectionHistory({ path, revision }: { path: string; revision: string }) {
  return <StaffHistory<AidCorrection> title="Riwayat koreksi bantuan" path={`${path}?history=corrections`} revision={revision}
    entryKey={(entry) => entry.id} renderEntry={(entry) => <div>
      <strong>{labels[entry.kind]}</strong>
      <p>Sebelum · {describe(entry.previous)}</p><p>Sesudah · {describe(entry.current)}</p>
      <p>Alasan · {entry.reason}</p><p>{entry.author} · {formatDate(entry.recordedAt)} WIB</p>
    </div>} />;
}
