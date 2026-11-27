"use client";

import { useEffect, useState } from "react";
import { ApiError, api, apiData } from "@/lib/client";
import { accountProfileSchema } from "@/lib/api-contracts";
import type { AccountProfile } from "@/lib/domain";
import { signInPath } from "@/lib/routes";

export function useAccountMenuActions({
  open,
  beforeSignOut,
  afterSignOut,
}: {
  open: boolean;
  beforeSignOut?: () => Promise<void>;
  afterSignOut?: () => Promise<void>;
}) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileIssue, setProfileIssue] = useState("");
  const [signOutIssue, setSignOutIssue] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open || profile) return;
    const controller = new AbortController();
    void apiData("profile", accountProfileSchema, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setProfile(value);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setProfileIssue(cause instanceof ApiError ? cause.message : "Informasi akun belum dapat dimuat.");
      });
    return () => controller.abort();
  }, [open, profile, reloadKey]);

  const profileLoading = open && !profile && !profileIssue;

  async function confirmSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutIssue("");
    if (!navigator.onLine) {
      setSignOutIssue("Anda sedang offline. Sambungkan perangkat ke internet untuk keluar dengan aman.");
      setSigningOut(false);
      return;
    }
    try {
      await beforeSignOut?.();
      await api("auth/sign-out", { method: "POST", signal: AbortSignal.timeout(8000) });
      await afterSignOut?.();
      window.location.replace(signInPath);
    } catch {
      setSignOutIssue("Sesi belum dapat diakhiri. Periksa koneksi lalu coba lagi.");
      setSigningOut(false);
    }
  }

  function retryProfile() {
    setProfileIssue("");
    setReloadKey((value) => value + 1);
  }

  function clearSignOutIssue() {
    setSignOutIssue("");
  }

  return {
    profile,
    profileLoading,
    profileIssue,
    signOutIssue,
    signingOut,
    confirmSignOut,
    retryProfile,
    clearSignOutIssue,
  };
}
