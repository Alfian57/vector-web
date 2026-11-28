"use client";

import { formatDate, type AidCorrection } from "@/lib/domain";
import { aidCorrectionSchema } from "@/lib/api-contracts";
import { StaffHistory } from "./staff-history";

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

export function AidCorrectionHistory({ path }: { path: string }) {
  return (
    <StaffHistory<AidCorrection>
      title="Riwayat koreksi bantuan"
      path={`${path}?history=corrections`}
      schema={aidCorrectionSchema}
      entryKey={(entry) => entry.id}
      columns={["Perubahan", "Sebelum", "Sesudah", "Alasan", "Petugas", "Waktu"]}
      renderEntry={(entry) => (
        <>
          <td>
            <strong>{labels[entry.kind]}</strong>
          </td>
          <td>{describe(entry.previous)}</td>
          <td>{describe(entry.current)}</td>
          <td>{entry.reason}</td>
          <td>{entry.author}</td>
          <td>{formatDate(entry.recordedAt)} WIB</td>
        </>
      )}
    />
  );
}
