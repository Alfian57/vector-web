"use client";

import { ScanLine } from "lucide-react";
import type { MapPackage } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { tw } from "@/lib/tw";
import { DashboardFormDialog } from "./dashboard-form-dialog";
import { ReportForm } from "./report-form";

export function ReportCreateDialog({
  open,
  onOpenChange,
  formInstance,
  ownerId,
  tiles,
  offlineMap,
  isCurrentForm,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formInstance: number;
  ownerId: string;
  tiles?: MapPackage;
  offlineMap?: OfflineMap;
  isCurrentForm: (instance: number) => boolean;
  onSaved: () => void;
}) {
  return (
    <DashboardFormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <button type="button" className={tw("primary")}>
          <ScanLine size={18} aria-hidden="true" /> Buat laporan
        </button>
      }
      title="Buat laporan"
      description="Catat temuan padi dan lokasi pengamatan dari lahan."
    >
      <ReportForm
        key={formInstance}
        ownerId={ownerId}
        tiles={tiles}
        offlineMap={offlineMap}
        variant="dialog"
        onSaved={() => {
          if (isCurrentForm(formInstance)) onOpenChange(false);
          onSaved();
        }}
      />
    </DashboardFormDialog>
  );
}
