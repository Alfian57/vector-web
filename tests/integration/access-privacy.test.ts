import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { db } from "../../lib/server/db";
import {
  baseUrl,
  createWhatsAppAccount,
  districtOffsetPoint,
  makeJpeg,
  resetMutableState,
  submitReport,
  TestSession,
} from "./helpers/test-kit";

describe("P0.1 access control and cross-account privacy", () => {
  const sampleUuid = randomUUID();

  beforeAll(async () => {
    await resetMutableState();
  });

  afterAll(async () => {
    await db().$disconnect();
  });

  test("visitors can open /, are redirected from /radar and /ppl to /masuk, and get 401 from protected APIs", async () => {
    const visitor = new TestSession();

    const home = await visitor.get("/");
    expect(home.status).toBe(200);

    const radar = await visitor.get("/radar");
    expect(radar.status).toBe(307);
    const radarNext = new URL(radar.headers.get("location") ?? "", baseUrl());
    expect(radarNext.pathname).toBe("/masuk");
    expect(radarNext.searchParams.get("next")).toBe("/radar");

    const radarAlerts = await visitor.get("/radar?view=alerts");
    expect(radarAlerts.status).toBe(307);
    const alertsNext = new URL(radarAlerts.headers.get("location") ?? "", baseUrl());
    expect(alertsNext.pathname).toBe("/masuk");
    expect(alertsNext.searchParams.get("next")).toBe("/radar?view=alerts");

    const ppl = await visitor.get("/ppl");
    expect(ppl.status).toBe(307);
    const pplNext = new URL(ppl.headers.get("location") ?? "", baseUrl());
    expect(pplNext.pathname).toBe("/masuk");
    expect(pplNext.searchParams.get("next")).toBe("/ppl");

    const sessionRes = await visitor.get("/api/session");
    expect(sessionRes.status).toBe(200);
    expect(await sessionRes.json()).toBeNull();

    const protectedRequests: Array<() => Promise<Response>> = [
      () => visitor.get("/api/radar"),
      () => visitor.get("/api/weather"),
      () => visitor.get("/api/search?q=petak"),
      () => visitor.get("/api/reports"),
      () => visitor.postJson("/api/reports", {}),
      () => visitor.get(`/api/reports/${sampleUuid}/photo`),
      () => visitor.patchJson(`/api/reports/${sampleUuid}/review`, {}),
      () => visitor.get(`/api/reports/${sampleUuid}/reviews`),
      () => visitor.patchJson(`/api/reports/${sampleUuid}/reviews`, {}),
      () => visitor.get("/api/plots"),
      () => visitor.postJson("/api/plots", {}),
      () => visitor.deleteJson(`/api/plots/${sampleUuid}`),
      () => visitor.get("/api/alerts"),
      () => visitor.patchJson(`/api/alerts/${sampleUuid}`),
      () => visitor.postJson("/api/push", {}),
      () => visitor.deleteJson("/api/push", { endpoint: "https://fcm.googleapis.com/fcm/send/test" }),
      () => visitor.postJson("/api/push/status", { endpoint: "https://fcm.googleapis.com/fcm/send/test" }),
      () => visitor.get("/api/ppl/events"),
      () => visitor.postJson("/api/ppl/broadcasts", {}),
      () => visitor.get("/api/ppl/follow-ups"),
      () => visitor.putJson("/api/ppl/follow-ups", {}),
      () => visitor.get("/api/ppl/follow-ups/history"),
      () => visitor.get("/api/ppl/aid-allocations"),
      () => visitor.postJson("/api/ppl/aid-allocations", {}),
      () => visitor.get(`/api/ppl/aid-allocations/${sampleUuid}`),
      () => visitor.postJson(`/api/ppl/aid-allocations/${sampleUuid}`, {}),
      () => visitor.patchJson(`/api/ppl/aid-allocations/${sampleUuid}`, {}),
    ];

    for (const invoke of protectedRequests) {
      const response = await invoke();
      expect(response.status).toBe(401);
    }
  });

  test("farmers can access own data, get 403 on all PPL APIs, and officers can access PPL operations", async () => {
    const farmerA = new TestSession();
    const farmerB = new TestSession();
    const officer = new TestSession();

    const accountA = await createWhatsAppAccount(farmerA, { name: "Petani A" });
    const accountB = await createWhatsAppAccount(farmerB, { name: "Petani B" });
    await createWhatsAppAccount(officer, { name: "PPL Uji", role: "officer" });

    const point = await districtOffsetPoint("32-15-03");
    const jpeg = await makeJpeg();

    // Farmer A creates report and plot
    const createdReport = await submitReport(farmerA, accountA.id, {
      longitude: point.longitude,
      latitude: point.latitude,
      finding: "blast",
      notes: "Laporan rahasia Petani A",
      photo: jpeg,
    });
    expect(createdReport.status).toBe(201);
    const { id: reportId } = (await createdReport.json()) as { id: string };

    const savedFollowUp = await officer.putJson("/api/ppl/follow-ups", {
      districtId: point.id,
      kind: "outreach",
      status: "complete",
      note: "Catatan operasional PPL rahasia khusus",
    });
    expect(savedFollowUp.status).toBe(200);

    const farmerSearchResponse = await farmerA.get("/api/search?q=rahasia%20Petani%20A");
    const farmerSearch = (await farmerSearchResponse.json()) as { entries: { id: string; kind: string }[] };
    expect(farmerSearch.entries).toContainEqual({ id: reportId, kind: "report" });
    const otherFarmerSearchResponse = await farmerB.get("/api/search?q=rahasia%20Petani%20A");
    const otherFarmerSearch = (await otherFarmerSearchResponse.json()) as { entries: { id: string; kind: string }[] };
    expect(otherFarmerSearch.entries.filter((entry) => entry.kind === "report")).toEqual([]);
    const officerReportSearchResponse = await officer.get("/api/search?q=rahasia%20Petani%20A");
    const officerReportSearch = (await officerReportSearchResponse.json()) as {
      entries: { id: string; kind: string }[];
    };
    expect(officerReportSearch.entries).toContainEqual({ id: reportId, kind: "report" });

    const officerOperationsResponse = await officer.get("/api/search?q=Catatan%20operasional%20PPL%20rahasia%20khusus");
    const officerOperationsSearch = (await officerOperationsResponse.json()) as {
      entries: { id: string; kind: string }[];
    };
    expect(officerOperationsSearch.entries.some((entry) => entry.kind === "follow-up")).toBe(true);
    const farmerOperationsResponse = await farmerA.get("/api/search?q=Catatan%20operasional%20PPL%20rahasia%20khusus");
    const farmerOperationsSearch = (await farmerOperationsResponse.json()) as {
      entries: { id: string; kind: string }[];
    };
    expect(farmerOperationsSearch.entries.some((entry) => entry.kind === "follow-up")).toBe(false);

    const createdPlot = await farmerA.postJson("/api/plots", {
      name: "Petak A",
      longitude: point.longitude,
      latitude: point.latitude,
    });
    expect(createdPlot.status).toBe(201);
    const plotsA = (await (await farmerA.get("/api/plots")).json()) as { id: string; name: string }[];
    expect(plotsA).toHaveLength(1);
    const plotId = plotsA[0].id;

    const plotSearchResponse = await farmerA.get("/api/search?q=Petak%20A");
    const plotSearch = (await plotSearchResponse.json()) as { entries: { id: string; kind: string }[] };
    expect(plotSearch.entries).toContainEqual({ id: plotId, kind: "plot" });
    const otherPlotSearchResponse = await farmerB.get("/api/search?q=Petak%20A");
    const otherPlotSearch = (await otherPlotSearchResponse.json()) as { entries: { id: string; kind: string }[] };
    expect(otherPlotSearch.entries.filter((entry) => entry.kind === "plot")).toEqual([]);
    const officerPlotSearchResponse = await officer.get("/api/search?q=Petak%20A");
    const officerPlotSearch = (await officerPlotSearchResponse.json()) as { entries: { id: string; kind: string }[] };
    expect(officerPlotSearch.entries.filter((entry) => entry.kind === "plot")).toEqual([]);

    // Farmer A can read own report & photo
    const listA = (await (await farmerA.get("/api/reports")).json()) as { reports: { id: string }[] };
    expect(listA.reports.map((r) => r.id)).toEqual([reportId]);
    expect((await farmerA.get(`/api/reports/${reportId}/photo`)).status).toBe(200);

    // Farmer B cannot see Farmer A's report, photo, plot, or impersonate via x-vektor-account
    const listB = (await (await farmerB.get("/api/reports")).json()) as { reports: { id: string }[] };
    expect(listB.reports).toEqual([]);
    expect((await farmerB.get(`/api/reports/${reportId}/photo`)).status).toBe(404);
    expect((await farmerB.get("/api/plots")).json()).resolves.toEqual([]);
    expect((await farmerB.deleteJson(`/api/plots/${plotId}`)).status).toBe(404);

    const impersonate = await submitReport(farmerB, accountA.id, {
      longitude: point.longitude,
      latitude: point.latitude,
      photo: jpeg,
    });
    expect(impersonate.status).toBe(403);

    const missingAccountHeader = await submitReport(farmerB, accountB.id, {
      longitude: point.longitude,
      latitude: point.latitude,
      photo: jpeg,
      omitOwnerHeader: true,
    });
    expect(missingAccountHeader.status).toBe(403);

    // Push subscription status isolation
    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    const subRes = await farmerA.postJson("/api/push", {
      endpoint,
      keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
    });
    expect(subRes.status).toBe(201);
    expect(await (await farmerA.postJson("/api/push/status", { endpoint })).json()).toEqual({ subscribed: true });
    expect(await (await farmerB.postJson("/api/push/status", { endpoint })).json()).toEqual({ subscribed: false });
    await farmerB.deleteJson("/api/push", { endpoint });
    expect(await (await farmerA.postJson("/api/push/status", { endpoint })).json()).toEqual({ subscribed: true });

    // Farmer redirected from /ppl and gets 403 on all PPL APIs
    const farmerPplPage = await farmerA.get("/ppl");
    expect(farmerPplPage.status).toBe(307);
    expect(farmerPplPage.headers.get("location")).toContain("/radar?notice=ppl-required");

    const pplRequestsForFarmer: Array<() => Promise<Response>> = [
      () => farmerA.get("/api/reports?scope=ppl"),
      () =>
        farmerA.patchJson(`/api/reports/${reportId}/review`, {
          status: "verified",
          finding: "blast",
          severity: "mild",
          note: "",
        }),
      () => farmerA.get(`/api/reports/${reportId}/reviews`),
      () =>
        farmerA.patchJson(`/api/reports/${reportId}/reviews`, {
          status: "rejected",
          revision: 1,
          note: "Tolak",
          reason: "Cek",
        }),
      () => farmerA.get("/api/ppl/events"),
      () => farmerA.postJson("/api/ppl/broadcasts", { districtId: point.id, title: "Uji", body: "Isi" }),
      () => farmerA.get("/api/ppl/follow-ups"),
      () =>
        farmerA.putJson("/api/ppl/follow-ups", {
          districtId: point.id,
          kind: "outreach",
          status: "planned",
          note: "Uji",
        }),
      () => farmerA.get("/api/ppl/follow-ups/history"),
      () => farmerA.get("/api/ppl/aid-allocations"),
      () =>
        farmerA.postJson("/api/ppl/aid-allocations", {
          id: randomUUID(),
          districtId: point.id,
          item: "Pupuk",
          quantity: 5,
          unit: "sak",
        }),
      () => farmerA.get(`/api/ppl/aid-allocations/${sampleUuid}`),
      () =>
        farmerA.postJson(`/api/ppl/aid-allocations/${sampleUuid}`, {
          id: randomUUID(),
          recipient: "Poktan",
          quantity: 1,
        }),
      () =>
        farmerA.patchJson(`/api/ppl/aid-allocations/${sampleUuid}`, {
          target: "allocation",
          revision: 0,
          reason: "Uji",
          districtId: point.id,
          item: "Pupuk",
          quantity: 6,
          unit: "sak",
          note: "",
        }),
    ];

    for (const invoke of pplRequestsForFarmer) {
      const response = await invoke();
      expect(response.status).toBe(403);
    }

    // Officer can access /ppl page, SSE events, queue, review, and report photo
    const officerPplPage = await officer.get("/ppl");
    expect(officerPplPage.status).toBe(200);

    const sseController = new AbortController();
    const sseRes = await officer.get("/api/ppl/events", { signal: sseController.signal });
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get("content-type")).toContain("text/event-stream");
    sseController.abort();

    const queueRes = await officer.get("/api/reports?scope=ppl");
    expect(queueRes.status).toBe(200);
    expect(((await queueRes.json()) as { reports: { id: string }[] }).reports.map((r) => r.id)).toContain(reportId);
    expect((await officer.get(`/api/reports/${reportId}/photo`)).status).toBe(200);

    // Radar snapshot never leaks private coordinates, ownerId, or report notes
    const radar = await (await farmerB.get("/api/radar")).json();
    expect(JSON.stringify(radar)).not.toMatch(/latitude|longitude|ownerId|Laporan rahasia Petani A/);
  });
});
