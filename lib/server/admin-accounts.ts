import { z } from "zod";
import type { Account } from "@/lib/domain";
import { db, transaction } from "./db";
import { writeActivity } from "./activity-log";
import { RequestError } from "./http";
import { adminPageIndex } from "./admin-pagination";

const pageSize = 25;
const accountChange = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(["farmer", "officer"]) }),
  z.object({ action: z.literal("ban"), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("unban") }),
]);

export async function listAdminAccounts(params: URLSearchParams) {
  const page = adminPageIndex(params);
  const roleParam = params.get("role");
  const state = params.get("state");
  const query = params.get("q")?.trim().slice(0, 100);
  if (
    (roleParam && !["farmer", "officer", "admin"].includes(roleParam)) ||
    (state && !["active", "banned"].includes(state))
  )
    throw new RequestError(422, "Filter akun tidak valid.");
  const where = {
    ...(roleParam ? { role: roleParam } : {}),
    ...(state ? { banned: state === "banned" } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { phoneNumber: { contains: query } },
          ],
        }
      : {}),
  };
  const rows = await db().user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: page * pageSize,
    take: pageSize + 1,
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      banned: true,
      banReason: true,
      createdAt: true,
    },
  });
  return { accounts: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function changeAccountAccess(actor: Account, userId: string, body: unknown) {
  const input = accountChange.parse(body);
  await transaction(async (client) => {
    const target = await client.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, banned: true, banReason: true },
    });
    if (!target) throw new RequestError(404, "Akun tidak ditemukan.");
    if (target.id === actor.id || target.role === "admin")
      throw new RequestError(403, "Akun Admin tidak dapat diubah dari menu ini.");

    if (input.action === "role") {
      if (target.role === input.role) return;
      await client.user.update({ where: { id: target.id }, data: { role: input.role, updatedAt: new Date() } });
      await client.session.deleteMany({ where: { userId: target.id } });
      await writeActivity(
        {
          category: "account",
          action: "account.role.changed",
          actor,
          targetType: "user",
          targetId: target.id,
          summary: `Role akun diubah dari ${target.role} menjadi ${input.role}.`,
        },
        client,
      );
      return;
    }

    if (input.action === "ban") {
      if (target.banned && target.banReason === input.reason) return;
      await client.user.update({
        where: { id: target.id },
        data: { banned: true, banReason: input.reason, banExpires: null, updatedAt: new Date() },
      });
      await client.session.deleteMany({ where: { userId: target.id } });
      await writeActivity(
        {
          category: "account",
          action: "account.banned",
          actor,
          targetType: "user",
          targetId: target.id,
          summary: "Akses akun dinonaktifkan.",
        },
        client,
      );
      return;
    }

    if (!target.banned) return;
    await client.user.update({
      where: { id: target.id },
      data: { banned: false, banReason: null, banExpires: null, updatedAt: new Date() },
    });
    await client.session.deleteMany({ where: { userId: target.id } });
    await writeActivity(
      {
        category: "account",
        action: "account.unbanned",
        actor,
        targetType: "user",
        targetId: target.id,
        summary: "Akses akun diaktifkan kembali.",
      },
      client,
    );
  });
}
