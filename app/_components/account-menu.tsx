"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Popover } from "@base-ui/react/popover";
import Link from "next/link";
import { ChevronDown, CircleUserRound, LogOut, Mail, MessageCircle, Phone } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { Account } from "@/lib/domain";
import { profilePath } from "@/lib/routes";
import { tw } from "@/lib/tw";
import { Avatar } from "./avatar";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { useAccountMenuActions } from "./use-account-menu";

type AccountMenuProps = {
  account: Account;
  beforeSignOut?: () => Promise<void>;
  afterSignOut?: () => Promise<void>;
  mobileLinks?: ReactNode;
  whatsappHref?: string;
};

function roleLabel(role: Account["role"]) {
  return role === "admin" ? "Admin" : role === "officer" ? "Petugas PPL" : "Petani";
}

export function AccountMenu({ account, beforeSignOut, afterSignOut, mobileLinks, whatsappHref }: AccountMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const {
    profile,
    profileLoading,
    profileIssue,
    signOutIssue,
    signingOut,
    confirmSignOut,
    retryProfile,
    clearSignOutIssue,
  } = useAccountMenuActions({ open, beforeSignOut, afterSignOut });
  const label = roleLabel(account.role);

  return (
    <div data-account-menu>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          ref={trigger}
          className="dashboard-account-trigger"
          aria-label={`Akun ${account.name}, ${label}`}
        >
          <Avatar name={account.name} src={account.image} />
          <span className="dashboard-account-trigger-copy">
            <strong>{account.name}</strong>
            <small>{label}</small>
          </span>
          <ChevronDown size={15} strokeWidth={1.75} aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner className="dashboard-popover-positioner" align="end" sideOffset={8}>
            <Popover.Popup className="dashboard-theme dashboard-account-popover">
              <Popover.Title className="sr-only">Akun VEKTOR</Popover.Title>
              <section aria-label="Menu akun">
                <div className="dashboard-account-contacts">
                  {profileLoading && <DashboardSkeleton label="Memuat informasi akun…" kind="contacts" rows={2} />}
                  {!profileLoading && profileIssue && (
                    <DashboardState
                      compact
                      kind="error"
                      title="Informasi akun belum dapat dimuat"
                      action={
                        <button className="dashboard-inline-link" onClick={retryProfile}>
                          Coba lagi
                        </button>
                      }
                    />
                  )}
                  {!profileLoading && !profileIssue && profile && (
                    <>
                      <p>
                        <Mail size={16} aria-hidden="true" />
                        {profile.email ?? "Email belum ditambahkan"}
                      </p>
                      <p>
                        <Phone size={16} aria-hidden="true" />
                        {profile.phoneNumber ?? "WhatsApp belum terhubung"}
                      </p>
                    </>
                  )}
                </div>
                <div className="dashboard-account-actions">
                  <Link href={profilePath} onClick={() => setOpen(false)}>
                    <CircleUserRound size={18} /> Profil
                  </Link>
                  {whatsappHref && (
                    <Link href={whatsappHref} onClick={() => setOpen(false)}>
                      <MessageCircle size={18} /> Hubungkan WhatsApp
                    </Link>
                  )}
                  {mobileLinks && <div className="dashboard-account-mobile-links">{mobileLinks}</div>}
                  <button
                    type="button"
                    className="dashboard-signout"
                    onClick={() => {
                      setOpen(false);
                      clearSignOutIssue();
                      setConfirming(true);
                    }}
                  >
                    <LogOut size={18} /> Keluar
                  </button>
                </div>
              </section>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <AlertDialog.Root
        open={confirming}
        onOpenChange={(next) => {
          if (!next && !signingOut) {
            setConfirming(false);
            clearSignOutIssue();
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="dashboard-backdrop" />
          <AlertDialog.Viewport className="dashboard-dialog-viewport">
            <AlertDialog.Popup
              className="dashboard-theme dashboard-dialog dashboard-confirmation"
              initialFocus={cancel}
              finalFocus={trigger}
            >
              <AlertDialog.Title>Keluar dari VEKTOR?</AlertDialog.Title>
              <AlertDialog.Description>
                Sesi akun pada perangkat ini akan diakhiri. Masuk kembali untuk membuka dashboard.
              </AlertDialog.Description>
              {signOutIssue && <DashboardState compact kind="error" title={signOutIssue} />}
              <div className="dashboard-dialog-actions">
                <AlertDialog.Close ref={cancel} disabled={signingOut} className={tw("secondary")}>
                  Batal
                </AlertDialog.Close>
                <button
                  type="button"
                  disabled={signingOut}
                  className={tw("danger")}
                  onClick={() => void confirmSignOut()}
                >
                  {signingOut ? "Mengakhiri sesi…" : "Ya, keluar"}
                </button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
