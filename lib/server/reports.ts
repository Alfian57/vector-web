import { createHash } from "node:crypto";
import sharp from "sharp";
import { findLabel, maxPhotoBytes, reportInput, type Account, type Position, type Report, type ReviewCorrection, type ReviewEntry, type ReviewInput } from "@/lib/domain";
import { Prisma } from "../../generated/prisma/client";
import { db, transaction, type DatabaseTransaction } from "./db";
import { RequestError } from "./http";
import { bumpRevision, recomputeRadar } from "./radar";

const reportColumns = Prisma.sql`r.id, ST_X(r.geom) AS longitude, ST_Y(r.geom) AS latitude,
  r.observed_at AS "observedAt", r.finding::text, r.notes, r.status::text, r.severity::text,
  r.review_note AS "reviewNote", r.review_revision AS "reviewRevision",
  d.id AS "districtId", d.name AS "districtName"`;

export async function locateDistrict(client: DatabaseTransaction, point: Position) {
  const [district] = await client.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM districts
    WHERE ST_Covers(geom, ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326))
    ORDER BY id LIMIT 1
  `;
  if (!district) throw new RequestError(422, "Pilih lokasi di wilayah uji Karawang.");
  return district;
}

export async function listReports(account: Account, params: URLSearchParams, staff: boolean) {
  const status = params.get("status");
  const finding = params.get("finding");
  const page = Number(params.get("page") ?? "0");
  if (!Number.isInteger(page) || page < 0 || page > 10000 ||
    (status && !["pending", "verified", "rejected"].includes(status)) ||
    (finding && !findLabel.safeParse(finding).success)) {
    throw new RequestError(422, "Filter laporan tidak valid.");
  }
  const rows = await db().$queryRaw<Report[]>`
    SELECT ${reportColumns}
    FROM reports r JOIN districts d ON d.id = r.district_id
    WHERE (${staff ? null : account.id}::text IS NULL OR r.owner_id = ${staff ? null : account.id})
      AND (${status || null}::report_status IS NULL OR r.status = ${status || null}::report_status)
      AND (${finding || null}::finding IS NULL OR r.finding = ${finding || null}::finding)
    ORDER BY r.submitted_at DESC, r.id DESC
    LIMIT 51 OFFSET ${page * 50}
  `;
  return { reports: rows.slice(0, 50), hasMore: rows.length > 50 };
}

export async function createReport(request: Request, owner: Account) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxPhotoBytes + 20_000) throw new RequestError(413, "Ukuran foto terlalu besar.");

  if (!request.body || !request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    throw new RequestError(422, "Sertakan data laporan dan foto.");
  }
  const reader = request.body.getReader();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxPhotoBytes + 20_000) {
      await reader.cancel();
      throw new RequestError(413, "Ukuran foto terlalu besar.");
    }
    parts.push(new Uint8Array(value));
  }
  const form = await new Response(new Blob(parts), { headers: request.headers }).formData().catch(() => null);
  if (!form) throw new RequestError(422, "Sertakan data laporan dan foto.");
  const payload = form.get("report");
  const photo = form.get("photo");
  if (typeof payload !== "string" || !(photo instanceof File) || !photo.size || photo.size > maxPhotoBytes) {
    throw new RequestError(422, "Sertakan data laporan dan foto yang valid.");
  }
  const input = reportInput.parse(JSON.parse(payload));
  if (Date.parse(input.observedAt) > Date.now()) {
    throw new RequestError(422, "Waktu pengamatan tidak boleh berada di masa depan.");
  }
  const image = Buffer.from(await photo.arrayBuffer());
  const digest = createHash("sha256").update(JSON.stringify(input)).update(image).digest("hex");
  const processor = sharp(image, { limitInputPixels: 20_000_000 });
  const metadata = await processor.metadata().catch(() => null);
  if (!metadata || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new RequestError(422, "Gunakan foto JPEG, PNG, atau WebP.");
  }
  const jpeg = await processor.rotate()
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 77 }).toBuffer().catch(() => null);
  if (!jpeg || jpeg.byteLength > maxPhotoBytes) throw new RequestError(422, "Foto tidak dapat diproses.");

  return transaction(async (client) => {
    const district = await locateDistrict(client, input);
    const [saved] = await client.$queryRaw<{ id: string }[]>`
      INSERT INTO reports (client_id, owner_id, payload_digest, district_id, geom, observed_at, finding, notes)
      VALUES (${input.id}::uuid, ${owner.id}, ${digest}, ${district.id},
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326),
        ${input.observedAt}::timestamptz, ${input.finding}::finding, ${input.notes})
      ON CONFLICT (owner_id, client_id) DO NOTHING RETURNING id
    `;
    if (saved) {
      await client.reportPhoto.create({ data: { reportId: saved.id, image: jpeg } });
      await bumpRevision(client);
      return { id: saved.id, created: true };
    }
    const existing = await client.report.findUniqueOrThrow({
      where: { ownerId_clientId: { ownerId: owner.id, clientId: input.id } },
      select: { id: true, payloadDigest: true },
    });
    if (existing.payloadDigest !== digest) throw new RequestError(409, "ID laporan sudah digunakan.");
    return { id: existing.id, created: false };
  });
}

export async function reportPhoto(account: Account, id: string) {
  const row = await db().reportPhoto.findUnique({
    where: { reportId: id, report: account.role === "officer" ? undefined : { ownerId: account.id } },
    select: { image: true },
  });
  if (!row) throw new RequestError(404, "Foto tidak ditemukan.");
  return new Response(new Uint8Array(row.image), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function listReportReviews(id: string, page: number) {
  const rows = await db().$queryRaw<ReviewEntry[]>`
    SELECT h.revision AS "reviewRevision", h.status::text, h.finding::text, h.severity::text, h.note AS "reviewNote",
      h.reason, u.name AS reviewer, h.recorded_at AS "recordedAt"
    FROM report_review_history h LEFT JOIN "user" u ON u.id = h.reviewer_id
    WHERE h.report_id = ${id}::uuid ORDER BY h.revision DESC LIMIT 11 OFFSET ${page * 10}
  `;
  return { entries: rows.slice(0, 10), hasMore: rows.length > 10 };
}

export async function reviewReport(id: string, reviewer: Account, review: ReviewInput | ReviewCorrection) {
  await transaction(async (client) => {
    const revision = "revision" in review ? review.revision : null;
    const count = await client.$executeRaw`
      UPDATE reports SET status = ${review.status}::report_status, reviewer_id = ${reviewer.id},
        review_note = ${review.note}, reviewed_at = clock_timestamp(),
        finding = COALESCE(${review.status === "verified" ? review.finding : null}::finding, finding),
        severity = ${review.status === "verified" ? review.severity : null}::severity, review_revision = review_revision + 1
      WHERE id = ${id}::uuid
        AND ((${revision}::int IS NULL AND status = 'pending') OR (status <> 'pending' AND review_revision = ${revision}::int))
    `;
    if (!count) {
      if (!await client.report.count({ where: { id } })) throw new RequestError(404, "Laporan tidak ditemukan.");
      throw new RequestError(409, revision === null ? "Laporan sudah ditinjau." : "Keputusan laporan sudah berubah. Buka kembali detail terbaru.");
    }
    await client.$executeRaw`
      INSERT INTO report_review_history (report_id, revision, status, finding, severity, note, reason, reviewer_id, recorded_at)
      SELECT id, review_revision, status, finding, severity, review_note, ${"reason" in review ? review.reason : null}, reviewer_id, reviewed_at FROM reports WHERE id = ${id}::uuid
    `;
    if (!await recomputeRadar(client, { corrected: revision !== null })) await bumpRevision(client);
  });
}
