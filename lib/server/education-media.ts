import sharp from "sharp";
import type { JSONContent } from "@tiptap/core";
import type { Account } from "@/lib/domain";
import {
  educationImageId,
  educationImageMaxBytes,
  educationImageSources,
  educationImageSrc,
  educationImagesMaxCount,
  educationImagesMaxTotalBytes,
  isPendingEducationImage,
} from "@/lib/education-images";
import { db, transaction } from "./db";
import { writeActivity } from "./activity-log";
import { RequestError } from "./http";

async function readImageForm(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const sizeError = "Ukuran unggahan gambar melebihi batas.";
  if (contentLength > maxBytes) throw new RequestError(413, sizeError);
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
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new RequestError(413, sizeError);
    }
    chunks.push(new Uint8Array(value));
  }
  const form = await new Response(new Blob(chunks), { headers: request.headers }).formData().catch(() => null);
  if (!form) throw new RequestError(422, "Unggahan gambar tidak valid.");
  return form;
}

function requireImageFile(file: unknown) {
  if (!(file instanceof File) || !file.size || file.size > educationImageMaxBytes) {
    throw new RequestError(422, "Pilih gambar berukuran maksimal 5 MB.");
  }
  return file;
}

export async function readEducationSaveRequest(request: Request) {
  const images = new Map<string, File>();
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    return { body: (await request.json()) as unknown, images };
  }

  const form = await readImageForm(request, educationImagesMaxTotalBytes + 1_000_000);
  const [article, extraArticle] = form.getAll("article");
  if (typeof article !== "string" || extraArticle !== undefined || article.length > 250_000) {
    throw new RequestError(422, "Data artikel tidak valid.");
  }
  let totalBytes = 0;
  for (const [field, value] of form.entries()) {
    if (field === "article") continue;
    const source = field.slice("image:".length);
    if (!field.startsWith("image:") || !isPendingEducationImage(source) || images.has(source)) {
      throw new RequestError(422, "Referensi gambar baru tidak valid.");
    }
    const file = requireImageFile(value);
    totalBytes += file.size;
    if (images.size >= educationImagesMaxCount || totalBytes > educationImagesMaxTotalBytes) {
      throw new RequestError(413, "Tambahkan maksimal 10 gambar baru dengan total 20 MB per penyimpanan.");
    }
    images.set(source, file);
  }
  return { body: JSON.parse(article) as unknown, images };
}

export async function optimizeEducationImage(file: File) {
  const input = Buffer.from(await file.arrayBuffer());
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
  if (!optimized || !optimized.data.byteLength || optimized.data.byteLength > educationImageMaxBytes) {
    throw new RequestError(422, "Gambar tidak dapat diproses.");
  }
  return {
    mimeType: "image/webp",
    image: optimized.data,
    width: optimized.info.width,
    height: optimized.info.height,
  };
}

export async function uploadEducationImage(actor: Account, articleId: string, request: Request) {
  const exists = await db().educationArticle.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!exists || exists.status === "archived") throw new RequestError(404, "Artikel tidak ditemukan.");
  const form = await readImageForm(request, educationImageMaxBytes + 20_000);
  const optimized = await optimizeEducationImage(requireImageFile(form.get("image")));
  const saved = await transaction(async (client) => {
    const media = await client.educationImage.create({
      data: { articleId, ...optimized },
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
  return { id: saved.id, src: educationImageSrc(saved.id) };
}

export async function educationImage(id: string, account: Account | null) {
  const imageId = id.toLowerCase();
  const media = await db().educationImage.findUnique({
    where: { id: imageId },
    select: {
      image: true,
      mimeType: true,
      article: { select: { status: true, thumbnailImageId: true, content: true } },
    },
  });
  if (!media) throw new RequestError(404, "Gambar tidak ditemukan.");
  const visible =
    media.article.status === "published" &&
    (media.article.thumbnailImageId === imageId ||
      Array.from(educationImageSources(media.article.content as JSONContent)).some(
        (source) => educationImageId(source) === imageId,
      ));
  if (!visible && account?.role !== "admin") {
    throw new RequestError(404, "Gambar tidak ditemukan.");
  }
  return new Response(new Uint8Array(media.image), {
    headers: {
      "Content-Type": media.mimeType,
      "Cache-Control":
        visible ? "public, max-age=300, must-revalidate" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
