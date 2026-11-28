"use client";

import type { AidAllocation } from "@/lib/domain";
import { tw } from "@/lib/tw";
import { AidForm } from "./aid-form";
import { AidCorrectionForm } from "./aid-correction-form";
import type { AidEdit } from "./aid-correction-types";
import { AllocationFields } from "./allocation-fields";
import { DeliveryFields } from "./delivery-fields";
import { usePplDistricts } from "./use-ppl-dashboard";

const route = "ppl/aid-allocations";

function DistrictIssue({ issue, retry }: { issue: string; retry: () => void }) {
  return (
    issue && (
      <p className={tw("message error-text")} role="alert">
        {issue}{" "}
        <button className={tw("text-link")} onClick={retry}>
          Coba lagi
        </button>
      </p>
    )
  );
}

export function AidCreateForm({ onSaved }: { onSaved?: () => void }) {
  const { districts, issue, retry } = usePplDistricts();
  return (
    <>
      <DistrictIssue issue={issue} retry={retry} />
      <AidForm
        path={route}
        button="Simpan alokasi"
        success="Alokasi bantuan tersimpan."
        disabled={!districts.length}
        onSaved={onSaved}
      >
        <AllocationFields districts={districts} />
      </AidForm>
    </>
  );
}

export function AidDeliveryForm({
  allocation,
  onCancel,
  onSaved,
}: {
  allocation: AidAllocation;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const remaining = allocation.quantity - allocation.deliveredQuantity;

  if (!remaining)
    return (
      <p className={tw("panel-note")} role="status">
        Seluruh alokasi sudah disalurkan.
      </p>
    );

  return (
    <AidForm
      path={`${route}/${allocation.id}`}
      button="Simpan penyaluran"
      success="Penyaluran tersimpan."
      onCancel={onCancel}
      onSaved={onSaved}
    >
      <DeliveryFields max={remaining} />
    </AidForm>
  );
}

export function AidEditForm({
  allocation,
  edit,
  onCancel,
  onSaved,
}: {
  allocation: AidAllocation;
  edit: AidEdit;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { districts, issue, retry } = usePplDistricts(edit.target === "allocation");
  return (
    <>
      <DistrictIssue issue={issue} retry={retry} />
      <AidCorrectionForm
        path={`${route}/${allocation.id}`}
        edit={edit}
        allocation={allocation}
        districts={districts}
        disabled={edit.target === "allocation" && !districts.length}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    </>
  );
}
