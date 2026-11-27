"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type { AccountProfile } from "@/lib/domain";
import { passwordMinimum } from "@/lib/whatsapp";
import { Avatar } from "@/app/_components/avatar";
import { PasswordInput } from "@/app/_components/password-input";
import { profileStyles as styles } from "./profile-classes";
import { useProfileSettings } from "./use-profile-settings";
import { tw } from "@/lib/tw";

const AvatarCropDialog = dynamic(() => import("./avatar-crop-dialog").then((module) => module.AvatarCropDialog), {
  ssr: false,
  loading: () => (
    <p className={tw(styles.helper)} role="status">
      Menyiapkan editor foto…
    </p>
  ),
});

export function ProfileForm({ initial }: { initial: AccountProfile }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useProfileSettings(initial);

  return (
    <div className={tw(styles.sections)}>
      <section className={tw(styles.card)} aria-labelledby="profile-info-title">
        <header className={tw(styles.cardHeader)}>
          <h2 className={tw(styles.cardTitle)} id="profile-info-title">
            Informasi profil
          </h2>
          <p className={tw(styles.cardDescription)}>
            Perbarui nama dan foto yang tampil di dashboard. Email dan WhatsApp terverifikasi ditampilkan sebagai
            informasi akun.
          </p>
        </header>
        {(avatarMessage || avatarError) && (
          <p
            className={tw(`${styles.feedback} ${avatarError ? styles.feedbackError : ""}`)}
            role={avatarError ? "alert" : "status"}
          >
            {avatarError || avatarMessage}
          </p>
        )}
        <div className={tw(styles.avatarBlock)}>
          <Avatar name={profile.name} src={profile.image} size="profile" />
          <div className={tw(styles.avatarActions)}>
            <strong className={tw(styles.avatarTitle)}>
              Foto profil <span className={tw("font-normal text-muted")}>(opsional)</span>
            </strong>
            <p className={tw(styles.helper)}>JPEG, PNG, atau WebP hingga 5 MB. Foto disimpan sebagai WebP persegi.</p>
            <label className={tw(styles.hiddenFile)} htmlFor="profile-avatar-file">
              Pilih foto profil (opsional)
            </label>
            <input
              ref={fileRef}
              id="profile-avatar-file"
              className={tw(styles.hiddenFile)}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby="profile-avatar-help"
              onChange={(event) => {
                chooseAvatar(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <div className={tw(styles.avatarButtons)}>
              <button
                className={tw(styles.avatarButton)}
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
              >
                Pilih atau ganti foto
              </button>
              {profile.image && (
                <button
                  type="button"
                  className={tw(`${styles.avatarButton} ${styles.removeButton}`)}
                  onClick={() => void removeAvatar()}
                  disabled={avatarBusy}
                >
                  Hapus foto
                </button>
              )}
            </div>
            <span id="profile-avatar-help" className={tw(styles.helper)}>
              Foto akan dipotong 1:1; Anda dapat menggeser, memperbesar, dan memutarnya.
            </span>
          </div>
        </div>
        <form className={tw(styles.form)} onSubmit={saveName}>
          <label className={tw(styles.field)} htmlFor="profile-name">
            Nama <span className={tw(styles.required)}>*</span>
            <input
              id="profile-name"
              className={tw(styles.input)}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={1}
              maxLength={100}
              autoComplete="name"
              placeholder="Contoh: Dewi Lestari"
            />
          </label>
          {(nameMessage || nameError) && (
            <p
              className={tw(`${styles.feedback} ${nameError ? styles.feedbackError : ""}`)}
              role={nameError ? "alert" : "status"}
            >
              {nameError || nameMessage}
            </p>
          )}
          <button className={tw(styles.button)} type="submit" disabled={nameBusy || name === profile.name}>
            {nameBusy ? "Menyimpan…" : "Simpan nama"}
          </button>
        </form>
        <div className={tw(styles.readOnly)} aria-label="Informasi kontak hanya-baca">
          <div className={tw(styles.readOnlyItem)}>
            <span className={tw(styles.readOnlyLabel)}>Email</span>
            <strong className={tw(styles.readOnlyValue)}>
              {profile.email ?? "Belum ditambahkan atau diverifikasi"}
            </strong>
          </div>
          <div className={tw(styles.readOnlyItem)}>
            <span className={tw(styles.readOnlyLabel)}>WhatsApp</span>
            <strong className={tw(styles.readOnlyValue)}>
              {profile.phoneNumber ?? "Belum terhubung atau diverifikasi"}
            </strong>
          </div>
        </div>
      </section>

      <section className={tw(styles.card)} aria-labelledby="profile-password-title">
        <header className={tw(styles.cardHeader)}>
          <h2 className={tw(styles.cardTitle)} id="profile-password-title">
            Keamanan akun
          </h2>
          <p className={tw(styles.cardDescription)}>
            Masukkan kata sandi saat ini untuk mengubahnya. Perangkat lain akan diminta masuk kembali.
          </p>
        </header>
        {(passwordMessage || passwordError) && (
          <p
            className={tw(`${styles.feedback} ${passwordError ? styles.feedbackError : ""}`)}
            role={passwordError ? "alert" : "status"}
          >
            {passwordError || passwordMessage}
          </p>
        )}
        <form className={tw(styles.passwordForm)} onSubmit={changePassword}>
          <div className={tw(styles.field)}>
            <label className={tw(styles.fieldLabel)} htmlFor="current-password">
              Kata sandi saat ini <span className={tw(styles.required)}>*</span>
            </label>
            <PasswordInput
              id="current-password"
              className={tw(styles.passwordInput)}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              maxLength={128}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi saat ini"
            />
          </div>
          <div className={tw(styles.field)}>
            <label className={tw(styles.fieldLabel)} htmlFor="new-password">
              Kata sandi baru <span className={tw(styles.required)}>*</span>
            </label>
            <PasswordInput
              id="new-password"
              className={tw(styles.passwordInput)}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={passwordMinimum}
              maxLength={128}
              autoComplete="new-password"
              placeholder={`Minimal ${passwordMinimum} karakter`}
            />
          </div>
          <div className={tw(styles.field)}>
            <label className={tw(styles.fieldLabel)} htmlFor="confirm-password">
              Konfirmasi kata sandi baru <span className={tw(styles.required)}>*</span>
            </label>
            <PasswordInput
              id="confirm-password"
              className={tw(styles.passwordInput)}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={passwordMinimum}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Ketik ulang kata sandi baru"
            />
          </div>
          <div className={tw(styles.passwordActions)}>
            <p>Gunakan sekurangnya {passwordMinimum} karakter. Sesi pada perangkat ini tetap aktif.</p>
            <button className={tw(styles.button)} type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Memperbarui…" : "Perbarui kata sandi"}
            </button>
          </div>
        </form>
      </section>
      {cropSource && (
        <AvatarCropDialog source={cropSource} busy={avatarBusy} onCancel={closeCropper} onSave={saveAvatar} />
      )}
    </div>
  );
}
