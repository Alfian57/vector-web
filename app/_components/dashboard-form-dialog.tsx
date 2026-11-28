"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useRef, type ReactElement, type ReactNode } from "react";

export function DashboardFormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger render={trigger} />}
      <Dialog.Portal>
        <Dialog.Backdrop className="dashboard-backdrop" />
        <Dialog.Viewport className="dashboard-dialog-viewport">
          <Dialog.Popup
            className="dashboard-theme dashboard-dialog dashboard-form-dialog"
            initialFocus={closeButton}
          >
            <header className="dashboard-form-dialog-heading">
              <div>
                <Dialog.Title className="dashboard-form-dialog-title">{title}</Dialog.Title>
                <Dialog.Description className="dashboard-form-dialog-description">
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close
                ref={closeButton}
                className="dashboard-icon-control"
                aria-label="Tutup dialog"
              >
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </header>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
