"use client";

import { formatDate, type AidCorrection } from "@/lib/domain";
import { aidCorrectionSchema } from "@/lib/api-contracts";
import { StaffHistory } from "./history";

const labels = {
  allocation: "Koreksi alokasi",
  delivery: "Koreksi penyaluran",
  "void-delivery": "Pembatalan penyaluran",
};

function describe(value: AidCorrection["current"]) {
  const description =
    "districtName" in value
      ? `${value.districtName} · ${value.item} · ${value.quantity} ${value.unit}`
      : `${value.recipient} · ${value.quantity}${value.voided ? " · dibatalkan" : ""}`;
  return value.note ? `${description} · ${value.note}` : description;
}

export function AidCorrectionHistory({ path, revision }: { path: string; revision: string }) {
  return (
    <StaffHistory<AidCorrection>
      title="Riwayat koreksi bantuan"
      path={`${path}?history=corrections`}
      revision={revision}
      schema={aidCorrectionSchema}
      entryKey={(entry) => entry.id}
      renderEntry={(entry) => (
        <div>
          <strong>{labels[entry.kind]}</strong>
          <p>Sebelum · {describe(entry.previous)}</p>
          <p>Sesudah · {describe(entry.current)}</p>
          <p>Alasan · {entry.reason}</p>
          <p>
            {entry.author} · {formatDate(entry.recordedAt)} WIB
          </p>
        </div>
      )}
    />
  );
}
