import type { Alert, FollowUp, FollowUpEntry, Page, Plot } from "@/lib/domain";
import { broadcastInput, followUpSubmission, plotInput, subscriptionInput } from "@/lib/domain";
import { db, transaction } from "./db";
import { RequestError } from "./http";
import { bumpRevision, createAlert } from "./radar";
import { locateDistrict } from "./reports";
import { dashboardPageSize } from "@/lib/pagination";

export async function listPlots(ownerId: string) {
  const rows = await db().$queryRaw<Plot[]>`
    SELECT p.id, p.name, d.name AS "districtName", ST_X(p.geom) AS longitude, ST_Y(p.geom) AS latitude
    FROM plots p JOIN districts d ON d.id = p.district_id
    WHERE p.owner_id = ${ownerId} ORDER BY p.name, p.id
  `;
  return rows;
}

export async function addPlot(ownerId: string, body: unknown) {
  const input = plotInput.parse(body);
  await transaction(async (client) => {
    const district = await locateDistrict(client, input);
    await client.$executeRaw`
      INSERT INTO plots (owner_id, district_id, geom, name)
      VALUES (${ownerId}, ${district.id}, ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326), ${input.name})
    `;
  });
}

export async function deletePlot(ownerId: string, id: string) {
  const { count } = await db().plot.deleteMany({ where: { id, ownerId } });
  if (!count) throw new RequestError(404, "Petak tidak ditemukan.");
}

export async function listAlerts(ownerId: string) {
  const rows = await db().$queryRaw<Alert[]>`
    SELECT a.id, a.title, a.body, a.created_at AS "createdAt", d.name AS "districtName", r.read_at IS NOT NULL AS read
    FROM alert_recipients r JOIN alerts a ON a.id = r.alert_id JOIN districts d ON d.id = a.district_id
    WHERE r.owner_id = ${ownerId} ORDER BY a.created_at DESC, a.id DESC LIMIT 100
  `;
  return rows;
}

export async function readAlert(ownerId: string, id: string) {
  const count = await db().$executeRaw`
    UPDATE alert_recipients SET read_at = COALESCE(read_at, now()) WHERE owner_id = ${ownerId} AND alert_id = ${id}::uuid
  `;
  if (!count) throw new RequestError(404, "Peringatan tidak ditemukan.");
}

export async function putSubscription(ownerId: string, body: unknown) {
  const input = subscriptionInput.parse(body);
  await db().pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { endpoint: input.endpoint, ownerId, keys: input.keys },
    update: { ownerId, keys: input.keys },
  });
}

export async function removeSubscription(ownerId: string, endpoint: string) {
  await db().pushSubscription.deleteMany({ where: { ownerId, endpoint } });
}

export async function ownsSubscription(ownerId: string, endpoint: string) {
  return Boolean(await db().pushSubscription.count({ where: { ownerId, endpoint } }));
}

export async function broadcast(authorId: string, body: unknown) {
  const input = broadcastInput.parse(body);
  return transaction(async (client) => {
    const district = await client.district.findUnique({ where: { id: input.districtId }, select: { id: true } });
    if (!district) throw new RequestError(422, "Kecamatan tidak ditemukan.");
    if (await createAlert(client, { ...input, authorId })) {
      await bumpRevision(client);
      return true;
    }
    const [prior] = await client.$queryRaw<{ matches: boolean }[]>`
      SELECT district_id = ${input.districtId} AND title = ${input.title} AND body = ${input.body} AS matches
      FROM alerts WHERE author_id = ${authorId} AND request_id = ${input.id}::uuid
    `;
    if (!prior?.matches) throw new RequestError(409, "ID siaran sudah dipakai untuk isian lain.");
    return false;
  });
}

export async function listFollowUps(page: number): Promise<Page<FollowUp>> {
  const database = db();
  const [rows, total] = await Promise.all([
    database.$queryRaw<FollowUp[]>`
      SELECT f.district_id AS "districtId", d.name AS "districtName", f.kind, f.status, f.note,
        f.updated_at AS "updatedAt"
      FROM follow_ups f JOIN districts d ON d.id = f.district_id
      ORDER BY f.updated_at DESC, f.district_id, f.kind
      LIMIT ${dashboardPageSize + 1} OFFSET ${page * dashboardPageSize}
    `,
    database.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM follow_ups`,
  ]);
  return {
    entries: rows.slice(0, dashboardPageSize),
    hasMore: rows.length > dashboardPageSize,
    totalPages: Math.ceil(Number(total[0]?.total ?? 0) / dashboardPageSize),
  };
}

export async function listFollowUpEntries(page: number): Promise<Page<FollowUpEntry>> {
  const database = db();
  const [rows, total] = await Promise.all([
    database.$queryRaw<FollowUpEntry[]>`
      SELECT f.id, f.district_id AS "districtId", d.name AS "districtName", f.kind, f.status, f.note,
        f.recorded_at AS "updatedAt", u.name AS author
      FROM follow_up_entries f JOIN districts d ON d.id = f.district_id JOIN "user" u ON u.id = f.author_id
      ORDER BY f.recorded_at DESC, f.id DESC
      LIMIT ${dashboardPageSize + 1} OFFSET ${page * dashboardPageSize}
    `,
    database.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM follow_up_entries`,
  ]);
  return {
    entries: rows.slice(0, dashboardPageSize),
    hasMore: rows.length > dashboardPageSize,
    totalPages: Math.ceil(Number(total[0]?.total ?? 0) / dashboardPageSize),
  };
}

export async function writeFollowUp(authorId: string, body: unknown) {
  const { id, districtId, kind, status, note } = followUpSubmission.parse(body);
  await transaction(async (client) => {
    const [entry] = await client.$queryRaw<{ id: string }[]>`
      INSERT INTO follow_up_entries (id, district_id, kind, status, note, author_id, recorded_at)
      SELECT COALESCE(${id ?? null}::uuid, gen_random_uuid()), id, ${kind}, ${status}, ${note}, ${authorId}, clock_timestamp()
      FROM districts WHERE id = ${districtId}
      ON CONFLICT (id) DO NOTHING RETURNING id
    `;
    if (!entry) {
      const [prior] = await client.$queryRaw<{ matches: boolean }[]>`
        SELECT district_id = ${districtId} AND kind = ${kind} AND status = ${status} AND note = ${note} AND author_id = ${authorId} AS matches
        FROM follow_up_entries WHERE id = ${id ?? null}::uuid
      `;
      if (!prior) throw new RequestError(422, "Kecamatan tidak ditemukan.");
      if (!prior.matches) throw new RequestError(409, "ID tindak lanjut sudah dipakai untuk isian lain.");
      return;
    }
    await client.$executeRaw`
      INSERT INTO follow_ups (district_id, kind, status, note, author_id, updated_at)
      SELECT district_id, kind, status, note, author_id, recorded_at FROM follow_up_entries WHERE id = ${entry.id}::uuid
      ON CONFLICT (district_id, kind) DO UPDATE SET
        status = EXCLUDED.status, note = EXCLUDED.note, author_id = EXCLUDED.author_id, updated_at = EXCLUDED.updated_at
      WHERE follow_ups.updated_at <= EXCLUDED.updated_at
    `;
    await bumpRevision(client);
  });
}
