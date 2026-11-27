import type { DistrictSummary, RadarSnapshot, Weather } from "@/lib/domain";
import { Prisma } from "../../generated/prisma/client";
import { db, type DatabaseTransaction } from "./db";

export async function bumpRevision(client: DatabaseTransaction) {
  await client.radarState.update({ where: { onlyRow: true }, data: { revision: { increment: 1 } } });
}

export async function createAlert(
  client: DatabaseTransaction,
  alert: { districtId: string; title: string; body: string; finding?: string; authorId?: string; id?: string },
) {
  const [saved] = await client.$queryRaw<{ id: string }[]>`
    INSERT INTO alerts (district_id, finding, author_id, title, body, request_id)
    VALUES (${alert.districtId}, ${alert.finding ?? null}::finding, ${alert.authorId ?? null},
      ${alert.title}, ${alert.body}, ${alert.id ?? null}::uuid)
    ON CONFLICT (author_id, request_id) DO NOTHING
    RETURNING id
  `;
  if (!saved) return false;
  await client.$executeRaw`
    INSERT INTO alert_recipients (alert_id, owner_id)
    SELECT DISTINCT ${saved.id}::uuid, owner_id FROM plots WHERE district_id = ${alert.districtId}
  `;
  await client.$executeRaw`
    INSERT INTO push_jobs (alert_id, endpoint, owner_id)
    SELECT a.alert_id, s.endpoint, s.owner_id
    FROM alert_recipients a JOIN push_subscriptions s USING (owner_id)
    WHERE a.alert_id = ${saved.id}::uuid
  `;
  return true;
}

const summaryColumns = Prisma.sql`d.id, d.name, c.finding::text AS finding, c.count, c.clustered`;

export async function radarSnapshot(): Promise<RadarSnapshot> {
  const [row] = await db().$queryRaw<RadarSnapshot[]>`
    WITH days AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date - 27 AS first_day),
    weeks AS (SELECT first_day + week * 7 AS start_day FROM days CROSS JOIN generate_series(0, 3) AS week),
    weekly_counts AS (
      SELECT start_day AS "startOn", start_day + 6 AS "endOn", count(r.id)::int AS count
      FROM weeks w LEFT JOIN reports r ON r.status = 'verified' AND r.finding NOT IN ('unknown', 'healthy')
        AND r.observed_at >= (w.start_day::timestamp AT TIME ZONE 'Asia/Jakarta')
        AND r.observed_at < ((w.start_day + 7)::timestamp AT TIME ZONE 'Asia/Jakarta')
        AND r.observed_at <= now()
      GROUP BY start_day
    )
    SELECT updated_at AS "updatedAt", (
      SELECT COALESCE(jsonb_agg(summary ORDER BY id, finding::finding), '[]'::jsonb)
      FROM (SELECT ${summaryColumns} FROM radar_counts c JOIN districts d ON d.id = c.district_id) summary
    ) AS summaries, (SELECT jsonb_agg(week ORDER BY "startOn") FROM weekly_counts week) AS trend
    FROM radar_state WHERE only_row
  `;
  return row;
}

export async function recomputeRadar(
  client: DatabaseTransaction,
  { corrected = false, notify = true }: { corrected?: boolean; notify?: boolean } = {},
) {
  await client.$queryRaw`SELECT 1 FROM radar_state WHERE only_row FOR UPDATE`;
  const previous = await client.$queryRaw<DistrictSummary[]>`
    SELECT ${summaryColumns} FROM radar_counts c JOIN districts d ON d.id = c.district_id
    ORDER BY d.id, c.finding::text
  `;
  const current = await client.$queryRaw<DistrictSummary[]>`
    WITH recent AS (
      SELECT district_id, finding,
        ST_ClusterDBSCAN(ST_Transform(geom, 32748), 500, 3)
          OVER (PARTITION BY finding ORDER BY id) AS cluster
      FROM reports
      WHERE status = 'verified'
        AND finding NOT IN ('unknown', 'healthy')
        AND observed_at BETWEEN now() - INTERVAL '7 days' AND now()
    )
    SELECT d.id, d.name, r.finding::text AS finding, count(*)::int AS count, bool_or(cluster IS NOT NULL) AS clustered
    FROM recent r JOIN districts d ON d.id = r.district_id
    GROUP BY d.id, d.name, r.finding
    ORDER BY d.id, r.finding::text
  `;
  if (JSON.stringify(previous) === JSON.stringify(current)) return false;

  if (notify) await notifyRadarChanges(client, previous, current, corrected);
  await client.radarCount.deleteMany();
  if (current.length) {
    await client.radarCount.createMany({
      data: current.map(({ id, finding, count, clustered }) => ({ districtId: id, finding, count, clustered })),
    });
  }
  await client.$executeRaw`UPDATE radar_state SET revision = revision + 1, updated_at = clock_timestamp() WHERE only_row`;
  return true;
}

async function notifyRadarChanges(
  client: DatabaseTransaction,
  previous: DistrictSummary[],
  current: DistrictSummary[],
  corrected: boolean,
) {
  const active = new Set(previous.filter((row) => row.clustered).map((row) => `${row.id}:${row.finding}`));
  for (const row of current) {
    if (!row.clustered || active.has(`${row.id}:${row.finding}`)) continue;
    await createAlert(client, {
      districtId: row.id,
      finding: row.finding,
      title: "Klaster terverifikasi",
      body: `Ada klaster laporan terverifikasi di ${row.name}. Periksa tanaman di petak pantauan Anda.`,
    });
  }
  if (corrected) {
    const stillActive = new Set(current.filter((row) => row.clustered).map((row) => `${row.id}:${row.finding}`));
    const affected = new Map(previous.filter((row) => row.clustered && !stillActive.has(`${row.id}:${row.finding}`))
      .map((row) => [row.id, row.name]));
    for (const [districtId, name] of affected) await createAlert(client, {
      districtId,
      title: "Koreksi data radar",
      body: `Petugas memperbarui hasil verifikasi di ${name}. Buka radar untuk melihat status klaster terkini.`,
    });
  }
}

export async function getWeather(): Promise<Weather | null> {
  const weather = await db().localWeather.findUnique({
    where: { onlyRow: true },
    select: { observedAt: true, fetchedAt: true, windSpeed: true, windDirection: true, humidity: true },
  });
  return weather && { ...weather, observedAt: weather.observedAt.toISOString(), fetchedAt: weather.fetchedAt.toISOString() };
}
