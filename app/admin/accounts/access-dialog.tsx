"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useRef } from "react";
import type { UserRow } from "./types";
import { AccountAccessForm } from "./access-form";

export function AccountAccessDialog({
  user,
  onClose,
  onUpdated,
}: {
  user: UserRow | null;
  onClose: () => void;
  onUpdated: (user: UserRow) => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="dashboard-backdrop" />
        <Dialog.Viewport className="dashboard-dialog-viewport">
          <Dialog.Popup
            className="dashboard-theme dashboard-dialog dashboard-form-dialog dashboard-admin-access-dialog"
            initialFocus={closeButton}
          >
            <header className="dashboard-form-dialog-heading">
              <div>
                <Dialog.Title className="dashboard-form-dialog-title">Kelola akses</Dialog.Title>
                <Dialog.Description className="dashboard-form-dialog-description">
                  {user
                    ? `${user.name} · ${user.email}${user.phoneNumber ? ` · ${user.phoneNumber}` : ""}`
                    : "Atur akses akun."}
                </Dialog.Description>
              </div>
              <Dialog.Close ref={closeButton} className="dashboard-icon-control" aria-label="Tutup dialog akses">
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </header>
            {user && <AccountAccessForm key={user.id} user={user} onUpdated={onUpdated} />}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
