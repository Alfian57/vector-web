import { z } from "zod";
import type { Account, AccountRole, ActivityLog, AdminOverview, Page } from "@/lib/domain";
import { db, transaction } from "./db";
import { writeActivity } from "./activity-log";
import { RequestError } from "./http";

const pageSize = 25;
const accountChange = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(["farmer", "officer"]) }),
  z.object({ action: z.literal("ban"), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("unban") }),
]);

function pageIndex(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10_000) throw new RequestError(422, "Nomor halaman tidak valid.");
  return page;
}

export async function listAdminAccounts(params: URLSearchParams) {
  const page = pageIndex(params);
  const roleParam = params.get("role");
  const state = params.get("state");
  const query = params.get("q")?.trim().slice(0, 100);
  if ((roleParam && !["farmer", "officer", "admin"].includes(roleParam)) ||
    (state && !["active", "banned"].includes(state))) throw new RequestError(422, "Filter akun tidak valid.");
  const where = {
    ...(roleParam ? { role: roleParam } : {}),
    ...(state ? { banned: state === "banned" } : {}),
    ...(query ? { OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { email: { contains: query, mode: "insensitive" as const } },
      { phoneNumber: { contains: query } },
    ] } : {}),
  };
  const rows = await db().user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: page * pageSize,
    take: pageSize + 1,
    select: { id: true, name: true, email: true, phoneNumber: true, role: true, banned: true, banReason: true, createdAt: true },
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
    if (target.id === actor.id || target.role === "admin") throw new RequestError(403, "Akun Admin tidak dapat diubah dari menu ini.");

    if (input.action === "role") {
      if (target.role === input.role) return;
      await client.user.update({ where: { id: target.id }, data: { role: input.role, updatedAt: new Date() } });
      await client.session.deleteMany({ where: { userId: target.id } });
      await writeActivity({
        category: "account", action: "account.role.changed", actor, targetType: "user", targetId: target.id,
        summary: `Role akun diubah dari ${target.role} menjadi ${input.role}.`,
      }, client);
      return;
    }

    if (input.action === "ban") {
      if (target.banned && target.banReason === input.reason) return;
      await client.user.update({
        where: { id: target.id },
        data: { banned: true, banReason: input.reason, banExpires: null, updatedAt: new Date() },
      });
      await client.session.deleteMany({ where: { userId: target.id } });
      await writeActivity({
        category: "account", action: "account.banned", actor, targetType: "user", targetId: target.id,
        summary: "Akses akun dinonaktifkan.",
      }, client);
      return;
    }

    if (!target.banned) return;
    await client.user.update({
      where: { id: target.id },
      data: { banned: false, banReason: null, banExpires: null, updatedAt: new Date() },
    });
    await client.session.deleteMany({ where: { userId: target.id } });
    await writeActivity({
      category: "account", action: "account.unbanned", actor, targetType: "user", targetId: target.id,
      summary: "Akses akun diaktifkan kembali.",
    }, client);
  });
}

export async function adminOverview(): Promise<AdminOverview> {
  const client = db();
  const [total, banned, userRoles, reportStatuses, educationStatuses, worker, weather, push] = await Promise.all([
    client.user.count(),
    client.user.count({ where: { banned: true } }),
    client.user.groupBy({ by: ["role"], _count: { _all: true } }),
    client.report.groupBy({ by: ["status"], _count: { _all: true } }),
    client.educationArticle.groupBy({ by: ["status"], _count: { _all: true } }),
    client.workerJobStatus.findMany({ orderBy: { job: "asc" } }),
    client.localWeather.findUnique({ where: { onlyRow: true }, select: { fetchedAt: true } }),
    client.$queryRaw<{ pending: number; failed: number }[]>`
      SELECT count(*) FILTER (WHERE done_at IS NULL)::int AS pending,
        count(*) FILTER (WHERE done_at IS NOT NULL AND attempts >= 5)::int AS failed
      FROM push_jobs
    `,
  ]);
  const countFor = (rows: { _count: { _all: number }; role?: string; status?: string }[], key: string) =>
    rows.find((row) => row.role === key || row.status === key)?._count._all ?? 0;
  return {
    accounts: {
      total, banned, farmers: countFor(userRoles, "farmer"), officers: countFor(userRoles, "officer"), admins: countFor(userRoles, "admin"),
    },
    reports: {
      pending: countFor(reportStatuses, "pending"),
      verified: countFor(reportStatuses, "verified"),
      rejected: countFor(reportStatuses, "rejected"),
    },
    education: { draft: countFor(educationStatuses, "draft"), published: countFor(educationStatuses, "published") },
    worker: worker.map(({ job, lastAttemptAt, lastSuccessAt, lastErrorCode }) => ({
      job, lastAttemptAt: lastAttemptAt.toISOString(), lastSuccessAt: lastSuccessAt?.toISOString() ?? null, lastErrorCode,
    })),
    push: { pending: push[0]?.pending ?? 0, failed: push[0]?.failed ?? 0 },
    weatherFetchedAt: weather?.fetchedAt.toISOString() ?? null,
  };
}

export async function listActivityLogs(params: URLSearchParams): Promise<Page<ActivityLog>> {
  const page = pageIndex(params);
  const kind = params.get("kind");
  const category = params.get("category")?.trim();
  const actorId = params.get("actor")?.trim();
  if (kind && !["audit", "system"].includes(kind)) throw new RequestError(422, "Jenis log tidak valid.");
  const from = params.get("from");
  const to = params.get("to");
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  if ((fromDate && !Number.isFinite(fromDate.valueOf())) || (toDate && !Number.isFinite(toDate.valueOf()))) {
    throw new RequestError(422, "Rentang waktu log tidak valid.");
  }
  const rows = await db().activityLog.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(category ? { category: category.slice(0, 80) } : {}),
      ...(actorId ? { actorId } : {}),
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: { actor: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: page * pageSize,
    take: pageSize + 1,
  });
  const entries: ActivityLog[] = rows.slice(0, pageSize).map(({ actor, ...row }) => ({
    ...row,
    kind: row.kind === "system" ? "system" : "audit",
    outcome: row.outcome === "failure" ? "failure" : "success",
    severity: row.severity === "warn" || row.severity === "error" ? row.severity : null,
    actorName: actor?.name ?? null,
    actorRole: isAccountRole(row.actorRole) ? row.actorRole : null,
    createdAt: row.createdAt.toISOString(),
  }));
  return { entries, hasMore: rows.length > pageSize };
}

function isAccountRole(role: string | null): role is AccountRole {
  return role === "farmer" || role === "officer" || role === "admin";
}

export async function updateWorkerStatus(job: string, errorCode?: string) {
  const client = db();
  const previous = await client.workerJobStatus.findUnique({ where: { job }, select: { lastErrorCode: true } });
  const now = new Date();
  await client.workerJobStatus.upsert({
    where: { job },
    create: {
      job, lastAttemptAt: now, lastSuccessAt: errorCode ? null : now,
      lastErrorCode: errorCode ?? null, updatedAt: now,
    },
    update: {
      lastAttemptAt: now,
      ...(errorCode ? { lastErrorCode: errorCode } : { lastSuccessAt: now, lastErrorCode: null }),
      updatedAt: now,
    },
  });
  if (errorCode && previous?.lastErrorCode !== errorCode) {
    const { logSystemEvent } = await import("./logger");
    await logSystemEvent("worker", `${job}.${errorCode}`);
  } else if (!errorCode && previous?.lastErrorCode) {
    const { logSystemEvent } = await import("./logger");
    await logSystemEvent("worker", `${job}.recovered`, "info", "success");
  }
}

export async function pruneOldActivityLogs(now = new Date()) {
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return db().activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
