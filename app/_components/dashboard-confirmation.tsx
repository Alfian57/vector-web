"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRef, type ReactNode } from "react";
import { tw } from "@/lib/tw";
import { DashboardState } from "./dashboard-state";

export function DashboardConfirmation({
  title,
  description,
  confirmLabel,
  pendingLabel,
  busy,
  issue,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  busy: boolean;
  issue?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog.Root
      open
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="dashboard-backdrop" />
        <AlertDialog.Viewport className="dashboard-dialog-viewport">
          <AlertDialog.Popup className="dashboard-theme dashboard-dialog dashboard-confirmation" initialFocus={cancel}>
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Description>{description}</AlertDialog.Description>
            {issue && <DashboardState compact kind="error" title={issue} />}
            <div className="dashboard-dialog-actions">
              <AlertDialog.Close ref={cancel} disabled={busy} className={tw("secondary")}>
                Batal
              </AlertDialog.Close>
              <button type="button" className={tw("danger")} disabled={busy} onClick={onConfirm}>
                {busy ? pendingLabel : confirmLabel}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
