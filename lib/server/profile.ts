import { z } from "zod";
import type { Account, AccountProfile } from "@/lib/domain";
import { db, transaction } from "./db";
import { writeActivity } from "./activity-log";
import { RequestError } from "./http";

const profileInput = z.object({ name: z.string().trim().min(1).max(100) }).strict();

export async function getAccountProfile(account: Account): Promise<AccountProfile> {
  const user = await db().user.findUnique({
    where: { id: account.id },
    select: {
      name: true,
      role: true,
      email: true,
      emailVerified: true,
      phoneNumber: true,
      phoneNumberVerified: true,
      image: true,
    },
  });
  if (!user) throw new RequestError(404, "Profil tidak ditemukan.");
  const syntheticEmail = user.email.endsWith("@whatsapp.invalid");
  return {
    name: user.name,
    role: account.role,
    email: user.emailVerified && !syntheticEmail ? user.email : null,
    phoneNumber: user.phoneNumberVerified ? user.phoneNumber : null,
    image: user.image,
  };
}

export async function updateAccountProfile(account: Account, body: unknown) {
  const { name } = profileInput.parse(body);
  const current = await db().user.findUnique({ where: { id: account.id }, select: { name: true } });
  if (!current) throw new RequestError(404, "Profil tidak ditemukan.");
  if (current.name === name) return getAccountProfile(account);

  await transaction(async (client) => {
    await client.user.update({ where: { id: account.id }, data: { name, updatedAt: new Date() } });
    await writeActivity(
      {
        category: "account",
        action: "account.profile.updated",
        actor: account,
        targetType: "user",
        targetId: account.id,
        summary: "Informasi profil diperbarui.",
      },
      client,
    );
  });
  return getAccountProfile(account);
}

export {
  accountAvatar,
  deleteAccountAvatar,
  processAvatarImage,
  profileAvatarUrl,
  saveAccountAvatar,
} from "./profile-avatar";
