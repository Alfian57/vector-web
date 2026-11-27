import sharp from "sharp";
import type { Account } from "@/lib/domain";
import { db, transaction } from "./db";
import { writeActivity } from "./activity-log";
import { RequestError } from "./http";

const maxImageBytes = 5_000_000;

async function readUpload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxImageBytes + 20_000) throw new RequestError(413, "Ukuran gambar melebihi 5 MB.");
  if (!request.body || !request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    throw new RequestError(422, "Pilih gambar artikel.");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxImageBytes + 20_000) {
      await reader.cancel();
      throw new RequestError(413, "Ukuran gambar melebihi 5 MB.");
    }
    chunks.push(new Uint8Array(value));
  }
  const form = await new Response(new Blob(chunks), { headers: request.headers }).formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || !file.size || file.size > maxImageBytes) {
    throw new RequestError(422, "Pilih gambar berukuran maksimal 5 MB.");
  }
  return Buffer.from(await file.arrayBuffer());
}

export async function uploadEducationImage(actor: Account, articleId: string, request: Request) {
  const exists = await db().educationArticle.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!exists || exists.status === "archived") throw new RequestError(404, "Artikel tidak ditemukan.");
  const input = await readUpload(request);
  const processor = sharp(input, { limitInputPixels: 20_000_000 });
  const metadata = await processor.metadata().catch(() => null);
  if (!metadata || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new RequestError(422, "Gunakan gambar JPEG, PNG, atau WebP.");
  }
  const optimized = await processor
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (!optimized || !optimized.data.byteLength || optimized.data.byteLength > maxImageBytes) {
    throw new RequestError(422, "Gambar tidak dapat diproses.");
  }
  const saved = await transaction(async (client) => {
    const media = await client.educationImage.create({
      data: {
        articleId,
        mimeType: "image/webp",
        image: optimized.data,
        width: optimized.info.width,
        height: optimized.info.height,
      },
      select: { id: true },
    });
    await writeActivity(
      {
        category: "education",
        action: "education.image.uploaded",
        actor,
        targetType: "education_article",
        targetId: articleId,
        summary: "Gambar artikel diunggah.",
      },
      client,
    );
    return media;
  });
  return { id: saved.id, src: `/api/education/images/${saved.id}` };
}

export async function educationImage(id: string, account: Account | null) {
  const media = await db().educationImage.findUnique({
    where: { id },
    select: { image: true, mimeType: true, article: { select: { status: true } } },
  });
  if (!media || (media.article.status !== "published" && account?.role !== "admin")) {
    throw new RequestError(404, "Gambar tidak ditemukan.");
  }
  return new Response(new Uint8Array(media.image), {
    headers: {
      "Content-Type": media.mimeType,
      "Cache-Control":
        media.article.status === "published" ? "public, max-age=300, must-revalidate" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
