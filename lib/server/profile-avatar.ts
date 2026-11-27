import sharp from "sharp";
import type { Account } from "@/lib/domain";
import { db, transaction } from "./db";
import { writeActivity } from "./activity-log";
import { RequestError } from "./http";

const avatarPath = "/api/profile/avatar";
const maxUploadBytes = 5_000_000;
const maxUploadPixels = 20_000_000;
const maxAvatarBytes = 524_288;
const avatarSize = 512;

export function profileAvatarUrl(version: string | number = Date.now()) {
  return `${avatarPath}?v=${version}`;
}

async function readAvatarUpload(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxUploadBytes + 20_000) throw new RequestError(413, "Ukuran gambar melebihi 5 MB.");
  if (!request.body || !request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    throw new RequestError(422, "Pilih gambar untuk avatar.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxUploadBytes + 20_000) {
      await reader.cancel();
      throw new RequestError(413, "Ukuran gambar melebihi 5 MB.");
    }
    chunks.push(new Uint8Array(value));
  }
  const form = await new Response(new Blob(chunks), { headers: request.headers }).formData().catch(() => null);
  const file = form?.get("image");
  if (file instanceof File && file.size > maxUploadBytes) {
    throw new RequestError(413, "Ukuran gambar melebihi 5 MB.");
  }
  if (!(file instanceof File) || !file.size) {
    throw new RequestError(422, "Pilih gambar JPEG, PNG, atau WebP hingga 5 MB.");
  }
  return Buffer.from(await file.arrayBuffer());
}

export async function saveAccountAvatar(account: Account, request: Request) {
  const input = await readAvatarUpload(request);
  const optimized = await processAvatarImage(input);
  const imageUrl = profileAvatarUrl();

  await transaction(async (client) => {
    await client.userAvatar.upsert({
      where: { userId: account.id },
      create: {
        userId: account.id,
        mimeType: "image/webp",
        image: Uint8Array.from(optimized),
        width: avatarSize,
        height: avatarSize,
        updatedAt: new Date(),
      },
      update: {
        mimeType: "image/webp",
        image: Uint8Array.from(optimized),
        width: avatarSize,
        height: avatarSize,
        updatedAt: new Date(),
      },
    });
    await client.user.update({ where: { id: account.id }, data: { image: imageUrl, updatedAt: new Date() } });
    await writeActivity(
      {
        category: "account",
        action: "account.avatar.updated",
        actor: account,
        targetType: "user",
        targetId: account.id,
        summary: "Foto profil diperbarui.",
      },
      client,
    );
  });
  return { image: imageUrl };
}

export async function processAvatarImage(input: Buffer): Promise<Buffer> {
  const processor = sharp(input, { limitInputPixels: maxUploadPixels });
  const metadata = await processor.metadata().catch(() => null);
  if (!metadata || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new RequestError(422, "Gunakan gambar JPEG, PNG, atau WebP.");
  }
  const optimized = await processor
    .rotate()
    .resize(avatarSize, avatarSize, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (
    !optimized?.data.byteLength ||
    optimized.data.byteLength > maxAvatarBytes ||
    optimized.info.width !== avatarSize ||
    optimized.info.height !== avatarSize
  ) {
    throw new RequestError(422, "Gambar avatar tidak dapat diproses.");
  }
  return optimized.data;
}

export async function deleteAccountAvatar(account: Account) {
  await transaction(async (client) => {
    const [existing, user] = await Promise.all([
      client.userAvatar.findUnique({ where: { userId: account.id }, select: { userId: true } }),
      client.user.findUnique({ where: { id: account.id }, select: { image: true } }),
    ]);
    if (!existing && !user?.image) return;
    await client.userAvatar.deleteMany({ where: { userId: account.id } });
    await client.user.update({ where: { id: account.id }, data: { image: null, updatedAt: new Date() } });
    await writeActivity(
      {
        category: "account",
        action: "account.avatar.deleted",
        actor: account,
        targetType: "user",
        targetId: account.id,
        summary: "Foto profil dihapus.",
      },
      client,
    );
  });
  return { image: null };
}

export async function accountAvatar(account: Account) {
  const avatar = await db().userAvatar.findUnique({
    where: { userId: account.id },
    select: { image: true, mimeType: true },
  });
  if (!avatar) throw new RequestError(404, "Avatar tidak ditemukan.");
  return new Response(new Uint8Array(avatar.image), {
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
