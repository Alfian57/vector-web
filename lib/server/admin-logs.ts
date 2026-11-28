import type { AccountRole, ActivityLog, Page } from "@/lib/domain";
import { db } from "./db";
import { RequestError } from "./http";
import { adminPageIndex } from "./admin-pagination";
import { dashboardPageSize } from "@/lib/pagination";

const pageSize = dashboardPageSize;

export async function listActivityLogs(params: URLSearchParams): Promise<Page<ActivityLog>> {
  const page = adminPageIndex(params);
  const kind = params.get("kind");
  const category = params.get("category")?.trim();
  const actorId = params.get("actor")?.trim();
  const account = params.get("account")?.trim().slice(0, 100);
  const query = params.get("q")?.trim().slice(0, 100);
  if (kind && !["audit", "system"].includes(kind)) throw new RequestError(422, "Jenis log tidak valid.");
  const from = params.get("from");
  const to = params.get("to");
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  if ((fromDate && !Number.isFinite(fromDate.valueOf())) || (toDate && !Number.isFinite(toDate.valueOf()))) {
    throw new RequestError(422, "Rentang waktu log tidak valid.");
  }
  const where = {
    ...(kind ? { kind } : {}),
    ...(category ? { category: category.slice(0, 80) } : {}),
    ...(actorId ? { actorId } : {}),
    ...(account
      ? {
          actor: {
            is: {
              OR: [
                { name: { contains: account, mode: "insensitive" as const } },
                { email: { contains: account, mode: "insensitive" as const } },
              ],
            },
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { action: { contains: query, mode: "insensitive" as const } },
            { category: { contains: query, mode: "insensitive" as const } },
            { summary: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    createdAt: { gte: fromDate, lte: toDate },
  };
  const [rows, total] = await Promise.all([
    db().activityLog.findMany({
      where,
      include: { actor: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: page * pageSize,
      take: pageSize + 1,
    }),
    db().activityLog.count({ where }),
  ]);
  const entries: ActivityLog[] = rows.slice(0, pageSize).map(({ actor, ...row }) => ({
    ...row,
    kind: row.kind === "system" ? "system" : "audit",
    outcome: row.outcome === "failure" ? "failure" : "success",
    severity: row.severity === "warn" || row.severity === "error" ? row.severity : null,
    actorName: actor?.name ?? null,
    actorRole: isAccountRole(row.actorRole) ? row.actorRole : null,
    createdAt: row.createdAt.toISOString(),
  }));
  return { entries, hasMore: rows.length > pageSize, totalPages: Math.ceil(total / pageSize) };
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
      job,
      lastAttemptAt: now,
      lastSuccessAt: errorCode ? null : now,
      lastErrorCode: errorCode ?? null,
      updatedAt: now,
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
