"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, apiData } from "@/lib/client";
import { accountProfileSchema, avatarImageResponseSchema } from "@/lib/api-contracts";
import type { AccountProfile } from "@/lib/domain";

const maxAvatarBytes = 5_000_000;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function errorText(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.message : fallback;
}

export function useProfileSettings(initial: AccountProfile) {
  const [profile, setProfile] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!cropSource) return;
    return () => URL.revokeObjectURL(cropSource);
  }, [cropSource]);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nameBusy) return;
    setNameBusy(true);
    setNameError("");
    setNameMessage("");
    try {
      const value = await apiData("profile", accountProfileSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setProfile(value);
      setName(value.name);
      setNameMessage("Nama berhasil diperbarui.");
    } catch (cause) {
      setNameError(errorText(cause, "Nama belum dapat diperbarui."));
    } finally {
      setNameBusy(false);
    }
  }

  function chooseAvatar(file?: File) {
    setAvatarMessage("");
    setAvatarError("");
    if (!file) return;
    if (!allowedAvatarTypes.has(file.type)) {
      setAvatarError("Gunakan gambar JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > maxAvatarBytes) {
      setAvatarError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    setCropSource(URL.createObjectURL(file));
  }

  function closeCropper() {
    setCropSource(null);
  }

  async function saveAvatar(blob: Blob) {
    if (avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError("");
    setAvatarMessage("");
    try {
      const form = new FormData();
      form.set("image", blob, "avatar.webp");
      const saved = await apiData("profile/avatar", avatarImageResponseSchema, { method: "POST", body: form });
      setProfile((current) => ({ ...current, image: saved.image }));
      setAvatarMessage("Foto profil berhasil diperbarui.");
      closeCropper();
    } catch (cause) {
      setAvatarError(errorText(cause, "Foto profil belum dapat disimpan."));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    if (avatarBusy || !profile.image) return;
    setAvatarBusy(true);
    setAvatarError("");
    setAvatarMessage("");
    try {
      await api("profile/avatar", { method: "DELETE" });
      setProfile((current) => ({ ...current, image: null }));
      setAvatarMessage("Foto profil dihapus. Avatar inisial akan digunakan.");
    } catch (cause) {
      setAvatarError(errorText(cause, "Foto profil belum dapat dihapus."));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordError("");
    setPasswordMessage("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi baru belum cocok.");
      return;
    }
    setPasswordBusy(true);
    try {
      await api("auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Kata sandi diperbarui. Sesi akun di perangkat lain telah diakhiri.");
    } catch (cause) {
      setPasswordError(errorText(cause, "Kata sandi belum dapat diperbarui."));
    } finally {
      setPasswordBusy(false);
    }
  }

  return {
    profile,
    name,
    setName,
    nameBusy,
    nameMessage,
    nameError,
    cropSource,
    avatarBusy,
    avatarMessage,
    avatarError,
    passwordBusy,
    passwordMessage,
    passwordError,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    saveName,
    chooseAvatar,
    closeCropper,
    saveAvatar,
    removeAvatar,
    changePassword,
  };
}
