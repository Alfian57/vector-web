"use client";

import { Dialog } from "@base-ui/react/dialog";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCcw, RotateCw } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import { renderImageCrop } from "./image-crop";
import { tw } from "@/lib/tw";

type CropShape = "rect" | "round";

function normalizeRotation(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

export function ImageCropDialog({
  source,
  title,
  description,
  aspect = 1,
  cropShape = "rect",
  busy = false,
  saveLabel = "Gunakan gambar",
  processingLabel = "Memotong gambar…",
  busyLabel = "Menyimpan gambar…",
  onCancel,
  onSave,
  finalFocus,
}: {
  source: string;
  title: string;
  description: string;
  aspect?: number;
  cropShape?: CropShape;
  busy?: boolean;
  saveLabel?: string;
  processingLabel?: string;
  busyLabel?: string;
  onCancel: () => void;
  onSave: (image: Blob) => Promise<void>;
  finalFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!cropArea || processing || busy) return;
    setProcessing(true);
    setError("");
    try {
      await onSave(await renderImageCrop(source, cropArea, rotation));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gambar belum dapat diproses.");
    } finally {
      setProcessing(false);
    }
  }

  function cancel() {
    if (processing || busy) return;
    onCancel();
  }

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCropArea(null);
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="dashboard-backdrop" />
        <Dialog.Viewport className="dashboard-dialog-viewport">
          <Dialog.Popup
            className="dashboard-theme dashboard-dialog dashboard-image-crop-dialog"
            initialFocus={cancelButton}
            finalFocus={finalFocus}
          >
            <div className={tw("dashboard-image-crop-inner")}>
              <header className={tw("dashboard-image-crop-heading")}>
                <Dialog.Title className={tw("dashboard-image-crop-title")}>{title}</Dialog.Title>
                <Dialog.Description className={tw("dashboard-image-crop-description")}>
                  {description}
                </Dialog.Description>
              </header>
              <div className={tw("dashboard-image-crop-area")}>
                <Cropper
                  image={source}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspect}
                  cropShape={cropShape}
                  showGrid
                  minZoom={1}
                  maxZoom={4}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={(_area, pixels) => setCropArea(pixels)}
                />
              </div>
              <div className={tw("dashboard-image-crop-controls")}>
                <label className={tw("dashboard-image-crop-slider")} htmlFor="image-crop-zoom">
                  Perbesaran <output>{zoom.toFixed(1)}×</output>
                  <input
                    id="image-crop-zoom"
                    type="range"
                    min={1}
                    max={4}
                    step={0.05}
                    value={zoom}
                    disabled={processing || busy}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    aria-valuetext={`${zoom.toFixed(1)} kali`}
                  />
                </label>
                <div className={tw("dashboard-image-crop-rotate")} role="group" aria-label="Putar gambar">
                  <button
                    type="button"
                    className={tw("secondary dashboard-image-crop-icon")}
                    aria-label="Putar 90 derajat ke kiri"
                    disabled={processing || busy}
                    onClick={() => setRotation((value) => normalizeRotation(value - 90))}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={tw("secondary dashboard-image-crop-icon")}
                    aria-label="Putar 90 derajat ke kanan"
                    disabled={processing || busy}
                    onClick={() => setRotation((value) => normalizeRotation(value + 90))}
                  >
                    <RotateCw size={16} aria-hidden="true" />
                  </button>
                </div>
                <label className={tw("dashboard-image-crop-slider")} htmlFor="image-crop-rotation">
                  Rotasi <output>{rotation}°</output>
                  <input
                    id="image-crop-rotation"
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={rotation}
                    disabled={processing || busy}
                    onChange={(event) => setRotation(Number(event.target.value))}
                    aria-valuetext={`${rotation} derajat`}
                  />
                </label>
                <button
                  type="button"
                  className={tw("secondary dashboard-image-crop-reset")}
                  disabled={processing || busy}
                  onClick={reset}
                >
                  Atur ulang
                </button>
              </div>
              {error && (
                <p className={tw("dashboard-image-crop-error")} role="alert">
                  {error}
                </p>
              )}
              <footer className={tw("dashboard-image-crop-actions")}>
                <button
                  type="button"
                  className={tw("secondary")}
                  ref={cancelButton}
                  disabled={processing || busy}
                  onClick={cancel}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className={tw("primary")}
                  disabled={!cropArea || processing || busy}
                  onClick={() => void save()}
                >
                  {processing ? processingLabel : busy ? busyLabel : saveLabel}
                </button>
              </footer>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
