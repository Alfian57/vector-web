"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { tw } from "@/lib/tw";

export function ImageDropzone({
  inputId,
  accept,
  description,
  inputLabel,
  onFile,
  disabled = false,
  describedBy,
  invalid = false,
  triggerButtonRef,
  className = "",
  preview,
  children,
}: {
  inputId: string;
  accept: string;
  description: string;
  inputLabel: string;
  onFile: (file?: File) => void;
  disabled?: boolean;
  describedBy?: string;
  invalid?: boolean;
  triggerButtonRef?: RefObject<HTMLButtonElement | null>;
  className?: string;
  preview?: ReactNode;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function receiveFile(file?: File) {
    if (disabled || !file) return;
    onFile(file);
  }

  return (
    <div
      className={tw(`dashboard-image-dropzone ${dragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""} ${className}`)}
      onDragEnter={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) receiveFile(event.dataTransfer.files.item(0) ?? undefined);
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(event) => {
          receiveFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <button
        ref={triggerButtonRef}
        type="button"
        className={tw("dashboard-image-dropzone-trigger")}
        aria-label={inputLabel}
        aria-describedby={`${inputId}-description${describedBy ? ` ${describedBy}` : ""}`}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      />
      <div className={tw("dashboard-image-dropzone-copy")} aria-live="polite">
        {preview ?? (
          <span className={tw("dashboard-image-dropzone-icon")}>
            <ImagePlus size={19} aria-hidden="true" />
          </span>
        )}
        <strong>
          {dragging
            ? "Lepaskan gambar untuk memilih"
            : preview
              ? "Klik atau seret untuk mengganti gambar"
              : "Klik atau seret gambar ke sini"}
        </strong>
      </div>
      {children && <div className={tw("dashboard-image-dropzone-actions")}>{children}</div>}
      <span id={`${inputId}-description`} className={tw("dashboard-image-dropzone-help")}>
        {description}
      </span>
    </div>
  );
}
