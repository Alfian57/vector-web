"use client";

import type { AidAllocation, District } from "@/lib/domain";
import { FieldLabel } from "../_components/field-label";
import { AidQuantity } from "./aid-form";
import { tw } from "@/lib/tw";

export function AllocationFields({
  districts,
  allocation,
  delivered = 0,
}: {
  districts: District[];
  allocation?: AidAllocation;
  delivered?: number;
}) {
  return (
    <>
      <label>
        <FieldLabel required>Kecamatan penerima</FieldLabel>
        <select name="districtId" defaultValue={allocation?.districtId ?? ""} required>
          <option value="" disabled>
            Pilih kecamatan
          </option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <FieldLabel required>Nama barang</FieldLabel>
        <input
          name="item"
          defaultValue={allocation?.item}
          placeholder="Contoh: Perangkap kuning"
          maxLength={100}
          required
        />
      </label>
      <div className={tw("form-two")}>
        <AidQuantity min={Math.max(1, delivered)} value={allocation?.quantity} />
        <label>
          <FieldLabel required>Satuan</FieldLabel>
          <input name="unit" defaultValue={allocation?.unit} placeholder="Contoh: lembar" required maxLength={30} />
        </label>
      </div>
    </>
  );
}
