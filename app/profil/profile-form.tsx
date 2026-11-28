"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { AccountProfile } from "@/lib/domain";
import { passwordMinimum } from "@/lib/whatsapp";
import { DashboardConfirmation } from "@/app/_components/dashboard-confirmation";
import { DashboardSkeleton } from "@/app/_components/dashboard-state";
import { Avatar } from "@/app/_components/avatar";
import { ImageDropzone } from "@/app/_components/image-dropzone";
import { PasswordInput } from "@/app/_components/password-input";
import { profileStyles as styles } from "./profile-classes";
import { useProfileSettings } from "./use-profile-settings";
import { tw } from "@/lib/tw";

const AvatarCropDialog = dynamic(() => import("./avatar-crop-dialog").then((module) => module.AvatarCropDialog), {
  ssr: false,
  loading: () => <DashboardSkeleton label="Menyiapkan editor foto…" kind="crop" />,
});

export function ProfileForm({ initial }: { initial: AccountProfile }) {
  const chooseButton = useRef<HTMLButtonElement>(null);
  const [confirmAvatarRemoval, setConfirmAvatarRemoval] = useState(false);
  const {
    profile,
    name,
    setName,
    nameBusy,
    nameError,
    cropSource,
    avatarBusy,
    avatarError,
    passwordBusy,
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

  async function confirmRemoveAvatar() {
    if (await removeAvatar()) setConfirmAvatarRemoval(false);
  }

  return (
    <div className={tw(styles.sections)}>
      <section className={tw(styles.card)} aria-labelledby="profile-info-title">
        <header className={tw(styles.cardHeader)}>
          <h2 className={tw(styles.cardTitle)} id="profile-info-title">
            Identitas dan kontak
          </h2>
        </header>
        {avatarError && !confirmAvatarRemoval && (
          <p className={tw(`${styles.feedback} ${styles.feedbackError}`)} role="alert">
            {avatarError}
          </p>
        )}
        <div className={tw(styles.avatarBlock)}>
          <div className={tw(styles.avatarIdentity)}>
            <span className="dashboard-profile-avatar-wrap">
              <Avatar name={profile.name} src={profile.image} size="profile" />
              {profile.image && (
                <button
                  type="button"
                  className="dashboard-profile-avatar-delete"
                  aria-label="Hapus foto profil"
                  title="Hapus foto profil"
                  onClick={() => setConfirmAvatarRemoval(true)}
                  disabled={avatarBusy}
                >
                  <Trash2 aria-hidden="true" size={15} strokeWidth={2} />
                </button>
              )}
            </span>
            <div className={tw(styles.avatarActions)}>
              <strong className="dashboard-profile-identity-name">{profile.name}</strong>
              <p className={tw(styles.helper)}>Foto disimpan sebagai WebP persegi.</p>
            </div>
          </div>
          <ImageDropzone
            inputId="profile-avatar-file"
            inputLabel="Pilih foto profil"
            accept="image/jpeg,image/png,image/webp"
            description="JPEG, PNG, atau WebP · maksimal 5 MB"
            describedBy="profile-avatar-help"
            onFile={chooseAvatar}
            disabled={avatarBusy}
            triggerButtonRef={chooseButton}
            className="dashboard-image-dropzone--profile"
          />
          <span id="profile-avatar-help" className={tw(styles.helper)}>
            Foto akan dipotong 1:1; Anda dapat menggeser, memperbesar, dan memutarnya.
          </span>
        </div>
        <form className={tw(styles.form)} onSubmit={saveName}>
          <label className={tw(styles.field)} htmlFor="profile-name">
            <span>
              Nama <span className={tw(styles.required)}>*</span>
            </span>
            <input
              id="profile-name"
              aria-invalid={nameError ? true : undefined}
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
          {nameError && (
            <p className={tw(`${styles.feedback} ${styles.feedbackError}`)} role="alert">
              {nameError}
            </p>
          )}
          <button className={tw(styles.button)} type="submit" disabled={nameBusy || name === profile.name}>
            {nameBusy ? "Menyimpan…" : "Simpan nama"}
          </button>
        </form>
        <dl
          className={tw(`${styles.readOnly} dashboard-profile-reported-contacts`)}
          aria-label="Informasi kontak hanya-baca"
        >
          <div className={tw(styles.readOnlyItem)}>
            <dt className={tw(styles.readOnlyLabel)}>Email</dt>
            <dd className={tw(styles.readOnlyValue)}>{profile.email ?? "Belum ditambahkan atau diverifikasi"}</dd>
          </div>
          <div className={tw(styles.readOnlyItem)}>
            <dt className={tw(styles.readOnlyLabel)}>WhatsApp</dt>
            <dd className={tw(styles.readOnlyValue)}>{profile.phoneNumber ?? "Belum terhubung atau diverifikasi"}</dd>
          </div>
        </dl>
      </section>
      {confirmAvatarRemoval && (
        <DashboardConfirmation
          title="Hapus foto profil?"
          description="Foto profil saat ini akan dihapus. Avatar inisial akan digunakan setelahnya."
          confirmLabel="Hapus foto"
          pendingLabel="Menghapus…"
          busy={avatarBusy}
          issue={avatarError}
          onCancel={() => setConfirmAvatarRemoval(false)}
          onConfirm={confirmRemoveAvatar}
        />
      )}

      <section className={tw(styles.card)} aria-labelledby="profile-password-title">
        <header className={tw(styles.cardHeader)}>
          <h2 className={tw(styles.cardTitle)} id="profile-password-title">
            Keamanan akun
          </h2>
          <p className={tw(styles.cardDescription)}>
            Masukkan kata sandi saat ini untuk mengubahnya. Perangkat lain akan diminta masuk kembali.
          </p>
        </header>
        {passwordError && (
          <p className={tw(`${styles.feedback} ${styles.feedbackError}`)} role="alert">
            {passwordError}
          </p>
        )}
        <form className={tw(styles.passwordForm)} onSubmit={changePassword}>
          <div className={tw(styles.field)}>
            <label className={tw(styles.fieldLabel)} htmlFor="current-password">
              Kata sandi saat ini <span className={tw(styles.required)}>*</span>
            </label>
            <PasswordInput
              id="current-password"
              aria-invalid={passwordError ? true : undefined}
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
        <AvatarCropDialog
          source={cropSource}
          busy={avatarBusy}
          onCancel={closeCropper}
          onSave={saveAvatar}
          finalFocus={chooseButton}
        />
      )}
    </div>
  );
}
