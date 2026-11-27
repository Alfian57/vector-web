"use client";

import Link from "next/link";
import { ChevronDown, CircleUserRound, LogOut, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Account } from "@/lib/domain";
import { profilePath } from "@/lib/routes";
import { Avatar } from "./avatar";
import { useAccountMenuActions } from "./use-account-menu";
import { accountMenuStyles } from "./account-menu-classes";
import { tw } from "@/lib/tw";

type AccountMenuProps = {
  account: Account;
  beforeSignOut?: () => Promise<void>;
  afterSignOut?: () => Promise<void>;
};

function roleLabel(role: Account["role"]) {
  return role === "admin" ? "Admin" : role === "officer" ? "Petugas PPL" : "Petani";
}

export function AccountMenu({ account, beforeSignOut, afterSignOut }: AccountMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logoutDialogRef = useRef<HTMLDialogElement>(null);
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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !logoutDialogRef.current?.open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const dialog = logoutDialogRef.current;
    if (confirming && dialog && !dialog.open) dialog.showModal();
    if (!confirming && dialog?.open) dialog.close();
  }, [confirming]);

  useEffect(() => {
    if (!confirming) return;
    logoutDialogRef.current?.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
  }, [confirming]);

  return (
    <div className={tw(accountMenuStyles.root)} data-account-menu ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={tw(accountMenuStyles.trigger)}
        aria-expanded={open}
        aria-controls="account-menu-panel"
        aria-label={`Akun ${account.name}, ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={account.name} src={account.image} />
        <span className={tw(accountMenuStyles.triggerCopy)}>
          <strong className={tw(accountMenuStyles.triggerName)}>{account.name}</strong>
          <small className={tw(accountMenuStyles.triggerRole)}>{label}</small>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={tw(open ? accountMenuStyles.chevronOpen : accountMenuStyles.chevron)}
        />
      </button>
      {open && (
        <section className={tw(accountMenuStyles.panel)} id="account-menu-panel" aria-label="Menu akun">
          <div className={tw(accountMenuStyles.identity)}>
            <Avatar name={account.name} src={profile?.image ?? account.image} size="large" />
            <div className={tw(accountMenuStyles.identityCopy)}>
              <strong className={tw(accountMenuStyles.identityName)}>{profile?.name ?? account.name}</strong>
              <span className={tw(accountMenuStyles.identityRole)}>{label}</span>
            </div>
          </div>
          <div className={tw(accountMenuStyles.contacts)} aria-live="polite">
            {profileLoading && (
              <p className={tw(accountMenuStyles.contactStatus)} role="status">
                Memuat informasi akun…
              </p>
            )}
            {!profileLoading && profileIssue && (
              <div className={tw(accountMenuStyles.profileError)}>
                <p className={tw(accountMenuStyles.profileErrorText)} role="alert">
                  Informasi akun belum dapat dimuat.
                </p>
                <button className={tw(accountMenuStyles.retryButton)} type="button" onClick={retryProfile}>
                  Coba lagi
                </button>
              </div>
            )}
            {!profileLoading && !profileIssue && profile && (
              <>
                <p className={tw(accountMenuStyles.contact)}>
                  <Mail className={tw(accountMenuStyles.contactIcon)} size={15} aria-hidden="true" />
                  <span>{profile.email ?? "Email belum ditambahkan"}</span>
                </p>
                <p className={tw(accountMenuStyles.contact)}>
                  <Phone className={tw(accountMenuStyles.contactIcon)} size={15} aria-hidden="true" />
                  <span>{profile.phoneNumber ?? "WhatsApp belum terhubung"}</span>
                </p>
              </>
            )}
          </div>
          <div className={tw(accountMenuStyles.actions)}>
            <Link className={tw(accountMenuStyles.action)} href={profilePath} onClick={() => setOpen(false)}>
              <CircleUserRound size={17} aria-hidden="true" />
              Profil
            </Link>
            <button
              className={tw(accountMenuStyles.action)}
              type="button"
              onClick={() => {
                setOpen(false);
                clearSignOutIssue();
                setConfirming(true);
              }}
            >
              <LogOut size={17} aria-hidden="true" />
              Keluar
            </button>
          </div>
        </section>
      )}
      <dialog
        ref={logoutDialogRef}
        className={tw(accountMenuStyles.dialog)}
        aria-labelledby="account-logout-title"
        onClose={() => {
          setConfirming(false);
          triggerRef.current?.focus();
        }}
        onCancel={(event) => {
          if (signingOut) {
            event.preventDefault();
            return;
          }
          setConfirming(false);
          clearSignOutIssue();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !signingOut) setConfirming(false);
        }}
      >
        <div className={tw(accountMenuStyles.dialogContent)}>
          <span className={tw(accountMenuStyles.dialogIcon)}>
            <UserRound size={21} aria-hidden="true" />
          </span>
          <h2 className={tw("text-[1.27rem]")} id="account-logout-title">
            Keluar dari VEKTOR?
          </h2>
          <p className={tw("text-[.88rem] leading-[1.55] text-muted")}>
            Sesi akun pada perangkat ini akan diakhiri. Anda perlu masuk kembali untuk membuka dashboard.
          </p>
          {signOutIssue && (
            <p className={tw(accountMenuStyles.logoutError)} role="alert">
              {signOutIssue}
            </p>
          )}
          <div className={tw(accountMenuStyles.dialogActions)}>
            <button
              type="button"
              className={tw(accountMenuStyles.cancelButton)}
              data-cancel
              disabled={signingOut}
              onClick={() => {
                setConfirming(false);
                clearSignOutIssue();
              }}
            >
              Batal
            </button>
            <button
              type="button"
              className={tw(accountMenuStyles.confirmButton)}
              disabled={signingOut}
              onClick={() => void confirmSignOut()}
            >
              {signingOut ? "Mengakhiri sesi…" : "Ya, keluar"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
