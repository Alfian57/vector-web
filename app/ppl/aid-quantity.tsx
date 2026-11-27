"use client";

import { FieldLabel } from "../_components/field-label";
import { maxAidQuantity } from "@/lib/domain";

export function AidQuantity({
  min = 1,
  max = maxAidQuantity,
  delivery = false,
  value,
}: {
  min?: number;
  max?: number;
  delivery?: boolean;
  value?: number;
}) {
  return (
    <label>
      <FieldLabel required>{delivery ? "Jumlah penyaluran" : "Jumlah alokasi"}</FieldLabel>
      <input
        name="quantity"
        type="number"
        placeholder={delivery ? "Contoh: 10" : "Contoh: 100"}
        min={min}
        max={max}
        step={1}
        defaultValue={value}
        required
      />
    </label>
  );
}
