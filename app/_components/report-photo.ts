import { maxPhotoBytes } from "@/lib/domain";

export async function compressReportPhoto(file: File) {
  if (file.size > 20_000_000) throw new Error("Pilih foto dengan ukuran maksimal 20 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Foto tidak terbaca. Gunakan foto JPEG, PNG, atau WebP.");
  }
  try {
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Perangkat tidak dapat memproses foto ini.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
    if (!blob || blob.size > maxPhotoBytes) throw new Error("Foto terlalu besar setelah dikompresi.");
    return blob;
  } finally {
    bitmap.close();
  }
}
