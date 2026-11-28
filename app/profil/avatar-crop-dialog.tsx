"use client";

import type { RefObject } from "react";
import { ImageCropDialog } from "@/app/_components/image-crop-dialog";

type AvatarCropDialogProps = {
  source: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (image: Blob) => Promise<void>;
  finalFocus: RefObject<HTMLButtonElement | null>;
};

export function AvatarCropDialog({ source, busy, onCancel, onSave, finalFocus }: AvatarCropDialogProps) {
  return (
    <ImageCropDialog
      key={source}
      source={source}
      title="Atur foto profil"
      description="Geser foto agar posisi pas. Anda dapat memperbesar, memutar, atau mengatur ulang potongan."
      aspect={1}
      cropShape="round"
      busy={busy}
      saveLabel="Gunakan foto ini"
      processingLabel="Memotong foto…"
      busyLabel="Menyimpan foto…"
      onCancel={onCancel}
      onSave={onSave}
      finalFocus={finalFocus}
    />
  );
}
