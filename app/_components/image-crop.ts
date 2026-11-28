import type { Area } from "react-easy-crop";

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar tidak dapat dibuka."));
    image.src = source;
  });
}

function toWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gambar hasil potong tidak dapat dibuat."))),
      "image/webp",
      0.9,
    );
  });
}

export async function renderImageCrop(source: string, area: Area, rotation: number) {
  const image = await loadImage(source);
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
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
  return toWebp(canvas);
}
