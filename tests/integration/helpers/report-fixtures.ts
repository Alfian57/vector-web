import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "../../../lib/server/db";
import { TestSession } from "./test-session";

export async function makeJpeg(r = 32, g = 96, b = 42) {
  return sharp({ create: { width: 32, height: 32, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();
}

export async function districtOffsetPoint(districtId: string, eastMeters = 0, northMeters = 0) {
  const [point] = await db().$queryRaw<
    { id: string; name: string; longitude: number; latitude: number; inside: boolean }[]
  >`
    WITH base AS (
      SELECT id, name, geom, ST_Transform(ST_PointOnSurface(geom), 32748) AS utm
      FROM districts
      WHERE id = ${districtId}
    ),
    shifted AS (
      SELECT id, name, geom, ST_Transform(ST_Translate(utm, ${eastMeters}, ${northMeters}), 4326) AS pt
      FROM base
    )
    SELECT id, name, ST_X(pt) AS longitude, ST_Y(pt) AS latitude, ST_Covers(geom, pt) AS inside
    FROM shifted
  `;
  if (!point) throw new Error(`District ${districtId} not found`);
  return point;
}

export async function submitReport(
  session: TestSession,
  ownerId: string,
  {
    id = randomUUID(),
    longitude,
    latitude,
    observedAt = new Date(Date.now() - 5000).toISOString(),
    finding = "blast",
    notes = "Gejala daun",
    photo,
    mimeType = "image/jpeg",
    omitOwnerHeader = false,
  }: {
    id?: string;
    longitude: number;
    latitude: number;
    observedAt?: string;
    finding?: string;
    notes?: string;
    photo?: Buffer;
    mimeType?: string;
    omitOwnerHeader?: boolean;
  },
) {
  const bytes = photo ?? (await makeJpeg());
  const form = new FormData();
  form.set("report", JSON.stringify({ id, longitude, latitude, observedAt, finding, notes }));
  form.set("photo", new Blob([new Uint8Array(bytes)], { type: mimeType }), "daun.jpg");
  const headers: Record<string, string> = {};
  if (!omitOwnerHeader) headers["x-vektor-account"] = ownerId;
  return session.request("/api/reports", {
    method: "POST",
    headers,
    body: form,
  });
}
