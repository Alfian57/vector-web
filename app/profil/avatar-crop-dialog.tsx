"use client";

import Cropper, { type Area } from "react-easy-crop";
import { RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { profileStyles as styles } from "./profile-classes";
import { tw } from "@/lib/tw";

type AvatarCropDialogProps = {
  source: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (image: Blob) => Promise<void>;
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar tidak dapat dibuka."));
    image.src = source;
  });
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gambar hasil crop tidak dapat dibuat."))),
      "image/webp",
      0.9,
    );
  });
}

function normalizeRotation(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

async function renderCrop(source: string, area: Area, rotation: number) {
  const image = await loadImage(source);
  const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const safeSize = Math.ceil(2 * Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = safeSize;
  canvas.height = safeSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Editor foto tidak tersedia di perangkat ini.");

  context.translate(safeSize / 2, safeSize / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.translate(-safeSize / 2, -safeSize / 2);
  context.drawImage(image, safeSize / 2 - width / 2, safeSize / 2 - height / 2, width, height);
  const rotated = context.getImageData(0, 0, safeSize, safeSize);
  const radians = (rotation * Math.PI) / 180;
  const rotatedWidth = Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height);
  const rotatedHeight = Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height);
  const cropX = Math.round(area.x * scale);
  const cropY = Math.round(area.y * scale);
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  context.putImageData(
    rotated,
    Math.round(-safeSize / 2 + rotatedWidth / 2 - cropX),
    Math.round(-safeSize / 2 + rotatedHeight / 2 - cropY),
  );
  return toBlob(canvas);
}

export function AvatarCropDialog({ source, busy, onCancel, onSave }: AvatarCropDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    dialog?.querySelector<HTMLButtonElement>("[data-crop-cancel]")?.focus();
  }, []);

  async function save() {
    if (!cropArea || processing || busy) return;
    setProcessing(true);
    setError("");
    try {
      await onSave(await renderCrop(source, cropArea, rotation));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Foto belum dapat diproses.");
    } finally {
      setProcessing(false);
    }
  }

  function cancel() {
    if (processing || busy) return;
    onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className={tw(styles.cropDialog)}
      aria-labelledby="avatar-crop-title"
      onClose={onCancel}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div className={tw(styles.cropDialogInner)}>
        <h2 className={tw(styles.cropTitle)} id="avatar-crop-title">
          Atur foto profil
        </h2>
        <p className={tw(styles.cropDescription)}>
          Geser foto agar posisi pas. Gunakan kontrol untuk memperbesar atau memutar gambar.
        </p>
        <div className={tw(styles.cropArea)}>
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid
            minZoom={1}
            maxZoom={3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_area, pixels) => setCropArea(pixels)}
          />
        </div>
        <div className={tw(styles.cropControls)}>
          <label className={tw(styles.cropLabel)} htmlFor="avatar-zoom">
            Perbesaran <output>{zoom.toFixed(1)}×</output>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-valuetext={`${zoom.toFixed(1)} kali`}
            />
          </label>
          <div className={tw(styles.rotateButtons)} aria-label="Putar foto">
            <button
              className={tw(styles.rotateButton)}
              type="button"
              aria-label="Putar 90 derajat ke kiri"
              onClick={() => setRotation((value) => normalizeRotation(value - 90))}
            >
              <RotateCcw size={17} aria-hidden="true" />
            </button>
            <button
              className={tw(styles.rotateButton)}
              type="button"
              aria-label="Putar 90 derajat ke kanan"
              onClick={() => setRotation((value) => normalizeRotation(value + 90))}
            >
              <RotateCw size={17} aria-hidden="true" />
            </button>
          </div>
          <label className={tw(styles.cropLabel)} htmlFor="avatar-rotation">
            Rotasi <output>{rotation}°</output>
            <input
              id="avatar-rotation"
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
              aria-valuetext={`${rotation} derajat`}
            />
          </label>
        </div>
        {error && (
          <p className={tw(styles.error)} role="alert">
            {error}
          </p>
        )}
        <div className={tw(styles.cropActions)}>
          <button
            type="button"
            className={tw(styles.cropCancel)}
            data-crop-cancel
            disabled={processing || busy}
            onClick={cancel}
          >
            Batal
          </button>
          <button
            type="button"
            className={tw(styles.cropConfirm)}
            disabled={!cropArea || processing || busy}
            onClick={() => void save()}
          >
            {processing || busy ? "Menyimpan foto…" : "Gunakan foto ini"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
