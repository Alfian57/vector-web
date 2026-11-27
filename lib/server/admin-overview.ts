import type { AccountRole, AdminOverview, AdminSearchResults, EducationStatus } from "@/lib/domain";
import { db } from "./db";

const searchResultLimit = 5;

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
    asOf: new Date().toISOString(),
    accounts: {
      total,
      banned,
      farmers: countFor(userRoles, "farmer"),
      officers: countFor(userRoles, "officer"),
      admins: countFor(userRoles, "admin"),
    },
    reports: {
      pending: countFor(reportStatuses, "pending"),
      verified: countFor(reportStatuses, "verified"),
      rejected: countFor(reportStatuses, "rejected"),
    },
    education: { draft: countFor(educationStatuses, "draft"), published: countFor(educationStatuses, "published") },
    worker: worker.map(({ job, lastAttemptAt, lastSuccessAt, lastErrorCode }) => ({
      job,
      lastAttemptAt: lastAttemptAt.toISOString(),
      lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
      lastErrorCode,
    })),
    push: { pending: push[0]?.pending ?? 0, failed: push[0]?.failed ?? 0 },
    weatherFetchedAt: weather?.fetchedAt.toISOString() ?? null,
  };
}

export async function searchAdminData(rawQuery: string): Promise<AdminSearchResults> {
  const query = rawQuery.trim().slice(0, 100);
  if (query.length < 2) return { accounts: [], education: [], logs: [] };
  const contains = { contains: query, mode: "insensitive" as const };
  const [accounts, education, logs] = await Promise.all([
    db().user.findMany({
      where: { OR: [{ name: contains }, { email: contains }, { phoneNumber: { contains: query } }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: searchResultLimit,
      select: { id: true, name: true, email: true, role: true, banned: true },
    }),
    db().educationArticle.findMany({
      where: { OR: [{ title: contains }, { summary: contains }, { category: contains }] },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: searchResultLimit,
      select: { id: true, title: true, category: true, status: true },
    }),
    db().activityLog.findMany({
      where: { OR: [{ action: contains }, { category: contains }, { summary: contains }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: searchResultLimit,
      select: { id: true, action: true, category: true, summary: true, createdAt: true },
    }),
  ]);
  return {
    accounts: accounts.map(({ role, ...account }) => ({ ...account, role: role as AccountRole })),
    education: education.map(({ status, ...article }) => ({ ...article, status: status as EducationStatus })),
    logs: logs.map(({ createdAt, ...log }) => ({ ...log, createdAt: createdAt.toISOString() })),
  };
}
