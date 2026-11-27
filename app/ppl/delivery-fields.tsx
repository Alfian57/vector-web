"use client";

import type { AidDelivery } from "@/lib/domain";
import { FieldLabel } from "../_components/field-label";
import { AidQuantity } from "./aid-form";
import { tw } from "@/lib/tw";

export function DeliveryFields({ max, delivery }: { max: number; delivery?: AidDelivery }) {
  return (
    <div className={tw("form-two")}>
      <label>
        <FieldLabel required>Kelompok penerima</FieldLabel>
        <input
          name="recipient"
          defaultValue={delivery?.recipient}
          placeholder="Contoh: Kelompok Tani Mekar"
          required
          maxLength={100}
        />
      </label>
      <AidQuantity delivery max={max} value={delivery?.quantity} />
    </div>
  );
}
