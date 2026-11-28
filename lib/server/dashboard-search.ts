import type { Account, DashboardSearchEntry, DashboardSearchResponse } from "@/lib/domain";
import { findings, statuses } from "@/lib/domain";
import {
  educationArticlePath,
  officerAllocationPath,
  officerFollowUpsPath,
  officerReportPath,
  radarSectionPath,
} from "@/lib/routes";
import { Prisma } from "../../generated/prisma/client";
import { db } from "./db";
import { RequestError } from "./http";

const resultLimit = 5;
const findingLabel = Prisma.sql`CASE r.finding::text
  WHEN 'healthy' THEN 'Sehat'
  WHEN 'blast' THEN 'Blas daun'
  WHEN 'blight' THEN 'Hawar daun bakteri'
  WHEN 'tungro' THEN 'Tungro'
  WHEN 'planthopper' THEN 'Wereng batang cokelat'
  WHEN 'brown_spot' THEN 'Bercak cokelat'
  ELSE 'Belum diketahui' END`;
const reportStatusLabel = Prisma.sql`CASE r.status::text
  WHEN 'pending' THEN 'Menunggu verifikasi'
  WHEN 'verified' THEN 'Terverifikasi'
  ELSE 'Ditolak' END`;

type ReportSearchRow = {
  id: string;
  finding: keyof typeof findings;
  status: keyof typeof statuses;
  districtName: string;
  notes: string;
};

function queryPattern(query: string) {
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}

function shortDescription(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 117)}…` : compact;
}

async function searchReports(account: Account, pattern: string): Promise<DashboardSearchEntry[]> {
  const staff = account.role === "officer";
  const rows = await db().$queryRaw<ReportSearchRow[]>`
    SELECT r.id::text AS id, r.finding::text AS finding, r.status::text AS status,
      d.name AS "districtName", r.notes
    FROM reports r JOIN districts d ON d.id = r.district_id
    WHERE (${staff}::boolean OR r.owner_id = ${account.id})
      AND (
        r.id::text ILIKE ${pattern} OR r.notes ILIKE ${pattern} OR d.name ILIKE ${pattern}
        OR r.finding::text ILIKE ${pattern} OR r.status::text ILIKE ${pattern}
        OR ${findingLabel} ILIKE ${pattern} OR ${reportStatusLabel} ILIKE ${pattern}
      )
    ORDER BY r.submitted_at DESC, r.id DESC
    LIMIT ${resultLimit}
  `;

  return rows.map((row): DashboardSearchEntry => ({
    id: row.id,
    kind: "report",
    label: `${findings[row.finding]} · ${row.districtName}`,
    description: shortDescription(`${statuses[row.status]} · ${row.notes}`),
    href: staff ? officerReportPath(row.id) : radarSectionPath("reports"),
  }));
}

async function searchPlots(ownerId: string, pattern: string): Promise<DashboardSearchEntry[]> {
  const rows = await db().$queryRaw<{ id: string; name: string; districtName: string }[]>`
    SELECT p.id::text AS id, p.name, d.name AS "districtName"
    FROM plots p JOIN districts d ON d.id = p.district_id
    WHERE p.owner_id = ${ownerId} AND (p.name ILIKE ${pattern} OR d.name ILIKE ${pattern})
    ORDER BY p.name, p.id
    LIMIT ${resultLimit}
  `;

  return rows.map((row): DashboardSearchEntry => ({
    id: row.id,
    kind: "plot",
    label: row.name,
    description: `Petak pantauan · ${row.districtName}`,
    href: radarSectionPath("plots"),
  }));
}

async function searchFollowUps(pattern: string): Promise<DashboardSearchEntry[]> {
  const kindLabel = Prisma.sql`CASE f.kind WHEN 'outreach' THEN 'Penyuluhan' ELSE 'Bantuan' END`;
  const statusLabel = Prisma.sql`CASE f.status WHEN 'planned' THEN 'Direncanakan' ELSE 'Selesai' END`;
  const rows = await db().$queryRaw<
    { districtId: string; districtName: string; kind: string; status: string; note: string }[]
  >`
    SELECT f.district_id AS "districtId", d.name AS "districtName", f.kind, f.status, f.note
    FROM follow_ups f JOIN districts d ON d.id = f.district_id
    WHERE f.note ILIKE ${pattern} OR d.name ILIKE ${pattern} OR f.kind ILIKE ${pattern}
      OR f.status ILIKE ${pattern} OR ${kindLabel} ILIKE ${pattern} OR ${statusLabel} ILIKE ${pattern}
    ORDER BY f.updated_at DESC, f.district_id, f.kind
    LIMIT ${resultLimit}
  `;

  return rows.map((row): DashboardSearchEntry => ({
    id: `${row.districtId}-${row.kind}`,
    kind: "follow-up",
    label: `${row.kind === "outreach" ? "Penyuluhan" : "Bantuan"} · ${row.districtName}`,
    description: shortDescription(`${row.status === "planned" ? "Direncanakan" : "Selesai"} · ${row.note}`),
    href: officerFollowUpsPath,
  }));
}

async function searchAidAllocations(query: string): Promise<DashboardSearchEntry[]> {
  const rows = await db().aidAllocation.findMany({
    where: {
      OR: [
        { item: { contains: query, mode: "insensitive" } },
        { note: { contains: query, mode: "insensitive" } },
        {
          district: {
            name: { contains: query, mode: "insensitive" },
          },
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: resultLimit,
    select: { id: true, item: true, quantity: true, unit: true, note: true, district: { select: { name: true } } },
  });

  return rows.map((row): DashboardSearchEntry => ({
    id: row.id,
    kind: "aid-allocation",
    label: `${row.item} · ${row.district.name}`,
    description: shortDescription(`${row.quantity} ${row.unit}${row.note ? ` · ${row.note}` : ""}`),
    href: officerAllocationPath(row.id),
  }));
}

async function searchPublishedEducation(query: string): Promise<DashboardSearchEntry[]> {
  const rows = await db().educationArticle.findMany({
    where: {
      status: "published",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: resultLimit,
    select: { id: true, slug: true, title: true, category: true, summary: true },
  });

  return rows.map((row): DashboardSearchEntry => ({
    id: row.id,
    kind: "education",
    label: row.title,
    description: shortDescription(`${row.category} · ${row.summary}`),
    href: educationArticlePath(row.slug),
  }));
}

export async function searchDashboardData(account: Account, rawQuery: string): Promise<DashboardSearchResponse> {
  const query = rawQuery.trim().slice(0, 100);
  if (account.role === "admin") throw new RequestError(403, "Gunakan pencarian khusus Admin.");
  if (query.length < 2) return { entries: [] };

  const pattern = queryPattern(query);
  if (account.role === "farmer") {
    const [reports, plots, education] = await Promise.all([
      searchReports(account, pattern),
      searchPlots(account.id, pattern),
      searchPublishedEducation(query),
    ]);
    return { entries: [...reports, ...plots, ...education] };
  }

  const [reports, followUps, aidAllocations, education] = await Promise.all([
    searchReports(account, pattern),
    searchFollowUps(pattern),
    searchAidAllocations(query),
    searchPublishedEducation(query),
  ]);
  return { entries: [...reports, ...followUps, ...aidAllocations, ...education] };
}
