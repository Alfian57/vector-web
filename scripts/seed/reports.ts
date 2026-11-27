import { createHash } from "node:crypto";
import type { DatabaseTransaction } from "../../lib/server/db";
import { plots, reports } from "../seed-data";
import { ago, demoId, farmer, officer } from "./shared";

export async function seedPlots(client: DatabaseTransaction) {
  for (const [index, [districtId, name]] of plots.entries()) {
    await client.$executeRaw`
      INSERT INTO plots (id, owner_id, district_id, geom, name)
      SELECT ${demoId(100 + index)}::uuid, ${farmer.id}, id, ST_PointOnSurface(geom), ${`Demo · ${name}`}
      FROM districts WHERE id = ${districtId}
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function seedReports(client: DatabaseTransaction, photo: Buffer) {
  for (const report of reports) {
    const id = demoId(report.key);
    const revision = report.corrected ? 2 : report.status === "pending" ? 0 : 1;
    const reviewer = revision ? officer.id : null;
    const reviewNote =
      report.status === "rejected"
        ? "Demo: unggah ulang dengan foto yang lebih jelas."
        : revision
          ? "Demo: pemeriksaan lapangan selesai."
          : null;
    const reviewedAt = ago(report.hoursAgo - 1);
    const offset = ((report.key % 5) - 2) * 0.00035;
    const digest = createHash("sha256").update(`vektor-demo:${id}`).digest("hex");
    const [saved] = await client.$queryRaw<{ id: string }[]>`
      WITH district AS (
        SELECT id, geom, ST_PointOnSurface(geom) AS anchor FROM districts WHERE id = ${report.district}
      ), sample AS (
        SELECT id, geom, anchor, ST_Translate(anchor, ${offset}::double precision, 0) AS point FROM district
      )
      INSERT INTO reports (id, client_id, owner_id, payload_digest, district_id, geom,
        observed_at, submitted_at, notes, finding, status, severity, reviewer_id, review_note, reviewed_at, review_revision)
      SELECT ${id}::uuid, ${id}::uuid, ${farmer.id}, ${digest}, id,
        CASE WHEN ST_Covers(geom, point) THEN point ELSE anchor END,
        ${ago(report.hoursAgo).toISOString()}::timestamptz, ${ago(report.hoursAgo - 0.5).toISOString()}::timestamptz,
        ${`Demo: ${report.notes} Foto hanya ilustrasi.`}, ${report.finding}::finding, ${report.status}::report_status,
        ${report.severity ?? null}::severity, ${reviewer}, ${reviewNote},
        ${revision ? reviewedAt.toISOString() : null}::timestamptz, ${revision}::integer
      FROM sample
      ON CONFLICT (id) DO UPDATE SET observed_at = EXCLUDED.observed_at,
        submitted_at = EXCLUDED.submitted_at, reviewed_at = EXCLUDED.reviewed_at
      WHERE reports.owner_id = EXCLUDED.owner_id AND reports.review_revision = EXCLUDED.review_revision
        AND reports.status = EXCLUDED.status
      RETURNING id
    `;
    if (!saved) continue;

    await client.reportPhoto.upsert({
      where: { reportId: id },
      create: { reportId: id, image: Uint8Array.from(photo) },
      update: {},
    });
    for (let index = 1; index <= revision; index++) {
      const initial = index < revision;
      const recordedAt = initial ? ago(report.hoursAgo - 0.75) : reviewedAt;
      await client.reportReviewHistory.upsert({
        where: { reportId_revision: { reportId: id, revision: index } },
        create: {
          reportId: id,
          revision: index,
          reviewerId: reviewer,
          recordedAt,
          status: report.status,
          finding: report.finding,
          severity: initial ? "mild" : (report.severity ?? null),
          note: initial ? "Demo: pemeriksaan pertama dicatat sebagai ringan." : reviewNote,
          reason: report.corrected && !initial ? "Demo: tingkat temuan diperbarui setelah kunjungan ulang." : null,
        },
        update: { recordedAt },
      });
    }
  }
}
