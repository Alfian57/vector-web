import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { processAvatarImage, profileAvatarUrl } from "../../lib/server/profile";
import type { DatabaseTransaction } from "../../lib/server/db";
import { administrator, farmer, officer, ago } from "./shared";

const seedAvatarAssets = [
  { userId: farmer.id, source: "public/demo-avatars/petani.webp" },
  { userId: officer.id, source: "public/demo-avatars/petugas.webp" },
  { userId: administrator.id, source: "public/demo-avatars/admin.webp" },
];

export async function prepareSeedAvatars() {
  const uploadDirectory = resolve(process.cwd(), "uploads", "avatars");
  await mkdir(uploadDirectory, { recursive: true });
  const avatars = new Map<string, { image: Buffer; imageUrl: string }>();
  const defaultAvatarPath = join(uploadDirectory, "default.webp");
  await copyFile(resolve(process.cwd(), "public/demo-avatars/default.webp"), defaultAvatarPath);
  await writeFile(defaultAvatarPath, await processAvatarImage(await readFile(defaultAvatarPath)));

  for (const asset of seedAvatarAssets) {
    const uploadPath = join(uploadDirectory, `${asset.userId}.webp`);
    await copyFile(resolve(process.cwd(), asset.source), uploadPath);
    const image = await processAvatarImage(await readFile(uploadPath));
    await writeFile(uploadPath, image);
    const version = createHash("sha256").update(image).digest("hex").slice(0, 16);
    avatars.set(asset.userId, { image, imageUrl: profileAvatarUrl(version) });
  }

  return avatars;
}

export async function seedAccounts(
  client: DatabaseTransaction,
  passwordHash: string,
  avatars: Map<string, { image: Buffer; imageUrl: string }>,
) {
  for (const account of [farmer, officer, administrator]) {
    const avatar = avatars.get(account.id);
    if (!avatar) throw new Error("Avatar demo belum disiapkan.");
    const existing = await client.user.findUnique({ where: { email: account.email }, select: { id: true } });
    if (existing && existing.id !== account.id) {
      throw new Error(`Email ${account.email} sudah digunakan oleh akun lain.`);
    }
    const phoneOwner = await client.user.findUnique({
      where: { phoneNumber: account.phoneNumber },
      select: { id: true },
    });
    if (phoneOwner && phoneOwner.id !== account.id) throw new Error("Nomor WhatsApp demo sudah digunakan akun lain.");
    await client.user.upsert({
      where: { id: account.id },
      create: { ...account, emailVerified: true, phoneNumberVerified: true, image: avatar.imageUrl },
      update: {
        emailVerified: true,
        phoneNumber: account.phoneNumber,
        phoneNumberVerified: true,
        role: account.role,
        image: avatar.imageUrl,
      },
    });
    await client.account.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        userId: account.id,
        accountId: account.id,
        providerId: "credential",
        password: passwordHash,
      },
      update: { password: passwordHash, updatedAt: ago(0) },
    });
    await client.userAvatar.upsert({
      where: { userId: account.id },
      create: {
        userId: account.id,
        mimeType: "image/webp",
        image: Uint8Array.from(avatar.image),
        width: 512,
        height: 512,
      },
      update: {
        mimeType: "image/webp",
        image: Uint8Array.from(avatar.image),
        width: 512,
        height: 512,
        updatedAt: ago(0),
      },
    });
  }
}
