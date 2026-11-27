import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { Page, RadarSnapshot, Report, ReviewEntry } from "../../lib/domain";
import { db } from "../../lib/server/db";
import {
  createWhatsAppAccount,
  districtOffsetPoint,
  makeJpeg,
  resetMutableState,
  submitReport,
  TestSession,
} from "./helpers/test-kit";

describe("P0.3 report verification, PostGIS clustering, and radar trends", () => {
  const cikampek = "32-15-13";
  const jatisari = "32-15-14";

  let farmer: TestSession;
  let otherFarmer: TestSession;
  let officer: TestSession;
  let farmerAccount: { id: string };

  beforeEach(async () => {
    await resetMutableState();
    farmer = new TestSession();
    otherFarmer = new TestSession();
    officer = new TestSession();
    farmerAccount = await createWhatsAppAccount(farmer, { name: "Petani Radar" });
    await createWhatsAppAccount(otherFarmer, { name: "Petani Radar Lain" });
    await createWhatsAppAccount(officer, { name: "PPL Radar", role: "officer" });
  });

  afterAll(async () => {
    await db().$disconnect();
  });

  test("excludes pending, rejected, healthy, unknown, and >7d reports from summaries and supports PPL queue filters", async () => {
    const pCikampek = await districtOffsetPoint(cikampek, 0, 0);
    const pJatisari = await districtOffsetPoint(jatisari, 0, 0);
    const photo = await makeJpeg();

    // Register farmer plot in Cikampek for alert checks later
    expect((await farmer.postJson("/api/plots", { name: "Petak Cikampek", longitude: pCikampek.longitude, latitude: pCikampek.latitude })).status).toBe(201);

    const create = async (longitude: number, latitude: number, finding: string, observedAt = new Date(Date.now() - 5000).toISOString()) => {
      const res = await submitReport(farmer, farmerAccount.id, { longitude, latitude, finding, observedAt, photo });
      expect(res.status).toBe(201);
      return ((await res.json()) as { id: string }).id;
    };

    const pendingId = await create(pCikampek.longitude, pCikampek.latitude, "blast");
    const rejectedId = await create(pCikampek.longitude, pCikampek.latitude, "blast");
    const healthyId = await create(pCikampek.longitude, pCikampek.latitude, "healthy");
    const verifiedUnknownAttempt = await create(pCikampek.longitude, pCikampek.latitude, "unknown");
    const verifiedBlastRecent = await create(pCikampek.longitude, pCikampek.latitude, "blast");
    const verifiedTungroJatisari = await create(pJatisari.longitude, pJatisari.latitude, "tungro");
    const verifiedOldBlast = await create(
      pCikampek.longitude,
      pCikampek.latitude,
      "blast",
      new Date(Date.now() - 8 * 86_400_000).toISOString(),
    );

    // Reject one
    expect((await officer.patchJson(`/api/reports/${rejectedId}/review`, { status: "rejected", note: "Foto buram" })).status).toBe(200);
    // Verifying with finding="unknown" must fail 422
    expect((await officer.patchJson(`/api/reports/${verifiedUnknownAttempt}/review`, { status: "verified", finding: "unknown", severity: "mild", note: "" })).status).toBe(422);
    // Verify healthy, recent blast, Jatisari tungro, old blast
    expect((await officer.patchJson(`/api/reports/${healthyId}/review`, { status: "verified", finding: "healthy", severity: "mild", note: "" })).status).toBe(200);
    expect((await officer.patchJson(`/api/reports/${verifiedBlastRecent}/review`, { status: "verified", finding: "blast", severity: "mild", note: "" })).status).toBe(200);
    expect((await officer.patchJson(`/api/reports/${verifiedTungroJatisari}/review`, { status: "verified", finding: "tungro", severity: "moderate", note: "" })).status).toBe(200);
    expect((await officer.patchJson(`/api/reports/${verifiedOldBlast}/review`, { status: "verified", finding: "blast", severity: "mild", note: "" })).status).toBe(200);

    // Radar summary contains only verified non-healthy/non-unknown reports within last 7 days
    const radar = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(radar.summaries).toEqual([
      { id: cikampek, name: pCikampek.name, finding: "blast", count: 1, clustered: false },
      { id: jatisari, name: pJatisari.name, finding: "tungro", count: 1, clustered: false },
    ]);
    // Trend (4 weeks = 28 days) counts recent blast, Jatisari tungro, and 8-day-old blast = 3 (excludes pending, rejected, healthy)
    expect(radar.trend?.reduce((sum, w) => sum + w.count, 0)).toBe(3);

    // PPL queue filter checks
    const pendingList = (await (await officer.get("/api/reports?scope=ppl&status=pending")).json()) as { reports: Report[] };
    expect(pendingList.reports.map((r) => r.id).sort()).toEqual([pendingId, verifiedUnknownAttempt].sort());

    const verifiedTungroList = (await (await officer.get("/api/reports?scope=ppl&status=verified&finding=tungro")).json()) as {
      reports: Report[];
    };
    expect(verifiedTungroList.reports).toHaveLength(1);
    expect(verifiedTungroList.reports[0]).toMatchObject({ id: verifiedTungroJatisari, districtId: jatisari, finding: "tungro" });

    const rejectedList = (await (await officer.get("/api/reports?scope=ppl&status=rejected")).json()) as { reports: Report[] };
    expect(rejectedList.reports.map((r) => r.id)).toEqual([rejectedId]);

    expect((await officer.get("/api/reports?scope=ppl&status=invalid")).status).toBe(422);
    expect((await officer.get("/api/reports?scope=ppl&finding=invalid")).status).toBe(422);
  });

  test("PostGIS DBSCAN forms cluster only at >=3 same-finding reports within 500m, and PPL correction updates radar & rejects stale revision", async () => {
    const p1 = await districtOffsetPoint(cikampek, -350, 0);
    const p2 = await districtOffsetPoint(cikampek, -200, 0); // 150m from p1
    const pFar = await districtOffsetPoint(cikampek, 400, 0); // 600m from p2 (>500m)
    const pSameSpot = await districtOffsetPoint(cikampek, -250, 0); // 100m from p1, 50m from p2
    for (const pt of [p1, p2, pFar, pSameSpot]) expect(pt.inside).toBe(true);

    // Farmer has plot in Cikampek; otherFarmer has plot in Jatisari
    const pJatisari = await districtOffsetPoint(jatisari, 0, 0);
    expect((await farmer.postJson("/api/plots", { name: "Petak Pantau", longitude: p1.longitude, latitude: p1.latitude })).status).toBe(201);
    expect((await otherFarmer.postJson("/api/plots", { name: "Petak Luar", longitude: pJatisari.longitude, latitude: pJatisari.latitude })).status).toBe(201);

    const photo = await makeJpeg();
    const createAndVerify = async (pt: { longitude: number; latitude: number }, finding: string) => {
      const res = await submitReport(farmer, farmerAccount.id, {
        longitude: pt.longitude,
        latitude: pt.latitude,
        finding,
        photo,
      });
      expect(res.status).toBe(201);
      const { id } = (await res.json()) as { id: string };
      expect(
        (await officer.patchJson(`/api/reports/${id}/review`, { status: "verified", finding, severity: "mild", note: "" })).status,
      ).toBe(200);
      return id;
    };

    // 2 blast reports 150m apart -> below threshold (3)
    const id1 = await createAndVerify(p1, "blast");
    await createAndVerify(p2, "blast");
    let radar = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(radar.summaries.find((s) => s.id === cikampek && s.finding === "blast")).toMatchObject({ count: 2, clustered: false });

    // 3rd blast report >500m away -> still not clustered
    await createAndVerify(pFar, "blast");
    radar = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(radar.summaries.find((s) => s.id === cikampek && s.finding === "blast")).toMatchObject({ count: 3, clustered: false });
    expect(await (await farmer.get("/api/alerts")).json()).toEqual([]);

    // Different finding (planthopper) right next to p1/p2 -> does NOT merge with blast cluster
    await createAndVerify(pSameSpot, "planthopper");
    radar = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(radar.summaries.find((s) => s.id === cikampek && s.finding === "blast")).toMatchObject({ count: 3, clustered: false });
    expect(radar.summaries.find((s) => s.id === cikampek && s.finding === "planthopper")).toMatchObject({ count: 1, clustered: false });

    // 3rd nearby blast report within 500m -> cluster forms and alerts plot owners in district
    const idClose = await createAndVerify(pSameSpot, "blast");
    radar = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(radar.summaries.find((s) => s.id === cikampek && s.finding === "blast")).toMatchObject({ count: 4, clustered: true });

    const alertsAfterCluster = (await (await farmer.get("/api/alerts")).json()) as { title: string }[];
    expect(alertsAfterCluster).toHaveLength(1);
    expect(alertsAfterCluster[0].title).toBe("Klaster terverifikasi");
    expect(await (await otherFarmer.get("/api/alerts")).json()).toEqual([]);

    // Initial /review cannot be repeated -> 409
    expect(
      (await officer.patchJson(`/api/reports/${idClose}/review`, { status: "verified", finding: "blast", severity: "severe", note: "" })).status,
    ).toBe(409);

    // Stale revision 0 rejected -> 409
    expect(
      (
        await officer.patchJson(`/api/reports/${idClose}/reviews`, {
          status: "rejected",
          revision: 0,
          note: "Salah revisi",
          reason: "Uji revisi lama",
        })
      ).status,
    ).toBe(409);

    // Valid correction at revision 1 dissolves cluster -> radar recomputed, history stored, correction alert created
    const correction = await officer.patchJson(`/api/reports/${idClose}/reviews`, {
      status: "rejected",
      revision: 1,
      note: "Lokasi salah",
      reason: "Verifikasi ulang di lapangan",
    });
    expect(correction.status).toBe(200);

    // Reusing revision 1 now fails with 409
    expect(
      (
        await officer.patchJson(`/api/reports/${idClose}/reviews`, {
          status: "verified",
          finding: "blast",
          severity: "mild",
          revision: 1,
          note: "",
          reason: "Revisi usang",
        })
      ).status,
    ).toBe(409);

    const history = (await (await officer.get(`/api/reports/${idClose}/reviews`)).json()) as Page<ReviewEntry>;
    expect(history.entries).toMatchObject([
      { reviewRevision: 2, status: "rejected", reason: "Verifikasi ulang di lapangan" },
      { reviewRevision: 1, status: "verified", finding: "blast", severity: "mild", reason: null },
    ]);

    radar = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(radar.summaries.find((s) => s.id === cikampek && s.finding === "blast")).toMatchObject({ count: 3, clustered: false });

    const alertsAfterDissolve = (await (await farmer.get("/api/alerts")).json()) as { title: string }[];
    expect(alertsAfterDissolve.map((a) => a.title)).toContain("Koreksi data radar");

    // Suppress unused variable warning for id1 while proving initial report stayed intact
    const verifiedList = (await (await officer.get("/api/reports?scope=ppl&status=verified&finding=blast")).json()) as {
      reports: Report[];
    };
    expect(verifiedList.reports.map((r) => r.id)).toContain(id1);
  });

  test("controls Asia/Jakarta weekly trend period boundaries accurately across UTC midnight", async () => {
    const point = await districtOffsetPoint(cikampek, 0, 0);
    const photo = await makeJpeg();

    const baseline = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(baseline.trend).toHaveLength(4);
    const [week0, week1, , week3] = baseline.trend!;

    const insertVerified = async (observedIso: string) => {
      const id = randomUUID();
      await db().$executeRaw`
        INSERT INTO reports (id, client_id, owner_id, payload_digest, district_id, geom, observed_at, notes, finding, status, severity, review_revision)
        VALUES (
          ${id}::uuid, ${id}::uuid, ${farmerAccount.id}, 'synthetic-trend', ${cikampek},
          ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326),
          ${observedIso}::timestamptz, 'Uji batas tren', 'blast'::finding, 'verified'::report_status, 'mild'::severity, 1
        )
      `;
    };

    // Before week0 start (23:59:59 WIB the day before week0.startOn) -> excluded
    const beforeRange = new Date(new Date(`${week0.startOn}T00:00:00.000+07:00`).getTime() - 1000).toISOString();
    // Exactly week0 start (00:00:00 WIB) -> week0
    const atWeek0Start = new Date(`${week0.startOn}T00:00:00.000+07:00`).toISOString();
    // 23:59:59 WIB on week0.endOn (16:59:59Z) -> week0
    const atWeek0End = new Date(`${week0.endOn}T23:59:59.000+07:00`).toISOString();
    // 00:00:00 WIB on week1.startOn (17:00:00Z on SAME UTC calendar day as atWeek0End!) -> week1
    const atWeek1Start = new Date(`${week1.startOn}T00:00:00.000+07:00`).toISOString();
    // Recent valid observation -> week3
    const recent = new Date(Date.now() - 5000).toISOString();
    // Future observation -> excluded by observed_at <= now()
    const future = new Date(Date.now() + 3_600_000).toISOString();

    // Verify atWeek0End and atWeek1Start share the exact same UTC date string yet cross WIB midnight
    expect(atWeek0End.slice(0, 10)).toBe(atWeek1Start.slice(0, 10));

    for (const iso of [beforeRange, atWeek0Start, atWeek0End, atWeek1Start, recent, future]) {
      await insertVerified(iso);
    }

    // Confirm photo helper isn't unused and radarSnapshot reflects exact WIB bucket counts
    expect(photo.byteLength).toBeGreaterThan(0);
    const snapshot = (await (await farmer.get("/api/radar")).json()) as RadarSnapshot;
    expect(snapshot.trend).toEqual([
      { startOn: week0.startOn, endOn: week0.endOn, count: 2 },
      { startOn: week1.startOn, endOn: week1.endOn, count: 1 },
      { startOn: baseline.trend![2].startOn, endOn: baseline.trend![2].endOn, count: 0 },
      { startOn: week3.startOn, endOn: week3.endOn, count: 1 },
    ]);
  });
});
