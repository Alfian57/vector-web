"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { ImageDropzone } from "@/app/_components/image-dropzone";
import { educationImageAccept } from "@/lib/education-images";
import { tw } from "@/lib/tw";

export function ArticleImageField({
  source,
  archived,
  busy,
  issue,
  triggerButtonRef,
  onFile,
  onRemove,
}: {
  source: string | null;
  archived: boolean;
  busy: boolean;
  issue: string;
  triggerButtonRef: RefObject<HTMLButtonElement | null>;
  onFile: (file?: File) => void;
  onRemove: () => void;
}) {
  const description = archived ? "Pulihkan artikel untuk mengubah thumbnail." : "JPEG, PNG, atau WebP · maksimal 5 MB";

  return (
    <div className={tw("dashboard-education-image-field")}>
      <div>
        <span className={tw("admin-field-label")}>Gambar artikel</span>
        <span className={tw("admin-help")}>Thumbnail untuk kartu artikel di Pusat edukasi.</span>
      </div>
      <ImageDropzone
        inputId="education-image"
        inputLabel={source ? "Ganti thumbnail artikel" : "Pilih thumbnail artikel"}
        accept={educationImageAccept}
        description={description}
        onFile={onFile}
        disabled={archived || busy}
        triggerButtonRef={triggerButtonRef}
        className="dashboard-image-dropzone--article"
        preview={
          source && (
            <Image
              className="dashboard-education-thumbnail-preview"
              src={source}
              alt="Pratinjau thumbnail"
              width={160}
              height={90}
              unoptimized
            />
          )
        }
      >
        {source && !archived && (
          <button
            type="button"
            className={tw("secondary dashboard-education-remove-thumbnail")}
            disabled={busy}
            onClick={() => {
              onRemove();
              triggerButtonRef.current?.focus();
            }}
          >
            Hapus thumbnail
          </button>
        )}
      </ImageDropzone>
      {issue && (
        <p className={tw("admin-feedback error")} role="alert">
          {issue}
        </p>
      )}
    </div>
  );
}
