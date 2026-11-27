import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { WebPushError } from "web-push";
import type { Alert } from "../../lib/domain";
import { db } from "../../lib/server/db";
import { deliverPush, refreshWeather } from "../../lib/server/jobs";
import { getWeather } from "../../lib/server/radar";
import { createWhatsAppAccount, districtOffsetPoint, resetMutableState, TestSession } from "./helpers/test-kit";

describe("P1.6 broadcasts, inbox isolation, Web Push worker, and Open-Meteo weather layer", () => {
  const cikampek = "32-15-13";
  const jatisari = "32-15-14";
  const originalFetch = globalThis.fetch;

  let officer: TestSession;
  let farmerCikampek: TestSession;
  let farmerJatisari: TestSession;
  let farmerNoPlots: TestSession;
  let accCikampek: { id: string };

  beforeEach(async () => {
    await resetMutableState();
    officer = new TestSession();
    farmerCikampek = new TestSession();
    farmerJatisari = new TestSession();
    farmerNoPlots = new TestSession();

    await createWhatsAppAccount(officer, { name: "PPL Siaran", role: "officer" });
    accCikampek = await createWhatsAppAccount(farmerCikampek, { name: "Petani Cikampek" });
    await createWhatsAppAccount(farmerJatisari, { name: "Petani Jatisari" });
    await createWhatsAppAccount(farmerNoPlots, { name: "Petani Tanpa Petak" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterAll(async () => {
    await db().$disconnect();
  });

  test("broadcast retries do not duplicate alerts or push jobs, and inbox only delivers to eligible plot owners", async () => {
    const pC1 = await districtOffsetPoint(cikampek, 0, 0);
    const pC2 = await districtOffsetPoint(cikampek, 200, 0);
    const pJ1 = await districtOffsetPoint(jatisari, 0, 0);

    // Farmer in Cikampek owns TWO plots in Cikampek; must still receive only ONE inbox item per alert
    expect((await farmerCikampek.postJson("/api/plots", { name: "Petak 1", longitude: pC1.longitude, latitude: pC1.latitude })).status).toBe(201);
    expect((await farmerCikampek.postJson("/api/plots", { name: "Petak 2", longitude: pC2.longitude, latitude: pC2.latitude })).status).toBe(201);
    expect((await farmerJatisari.postJson("/api/plots", { name: "Petak Jatisari", longitude: pJ1.longitude, latitude: pJ1.latitude })).status).toBe(201);

    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    expect(
      (
        await farmerCikampek.postJson("/api/push", {
          endpoint,
          keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
        })
      ).status,
    ).toBe(200);

    const broadcastId = randomUUID();
    const payload = {
      id: broadcastId,
      districtId: cikampek,
      title: "Peringatan Cikampek",
      body: "Pantau gejala di petak Anda.",
    };

    const [first, second] = await Promise.all([
      officer.postJson("/api/ppl/broadcasts", payload),
      officer.postJson("/api/ppl/broadcasts", payload),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);

    // Sequential retry also returns 200 without duplicating
    expect((await officer.postJson("/api/ppl/broadcasts", payload)).status).toBe(200);
    // Conflicting body with same ID returns 409
    expect((await officer.postJson("/api/ppl/broadcasts", { ...payload, body: "Isi berbeda" })).status).toBe(409);

    expect(await db().alert.count({ where: { requestId: broadcastId } })).toBe(1);
    expect(await db().alertRecipient.count({ where: { ownerId: accCikampek.id } })).toBe(1);
    expect(await db().pushJob.count({ where: { endpoint } })).toBe(1);

    // Inbox isolation checks
    const inboxCikampek = (await (await farmerCikampek.get("/api/alerts")).json()) as Alert[];
    expect(inboxCikampek).toHaveLength(1);
    expect(inboxCikampek[0]).toMatchObject({ title: "Peringatan Cikampek", read: false });

    expect(await (await farmerJatisari.get("/api/alerts")).json()).toEqual([]);
    expect(await (await farmerNoPlots.get("/api/alerts")).json()).toEqual([]);

    // Non-recipient cannot mark alert read (404); owner can
    expect((await farmerJatisari.patchJson(`/api/alerts/${inboxCikampek[0].id}`)).status).toBe(404);
    expect((await farmerCikampek.patchJson(`/api/alerts/${inboxCikampek[0].id}`)).status).toBe(200);
    const afterRead = (await (await farmerCikampek.get("/api/alerts")).json()) as Alert[];
    expect(afterRead[0].read).toBe(true);
  });

  test("Web Push failures keep inbox messages intact, schedule backoff retries, and clean up 410 subscriptions", async () => {
    const pC = await districtOffsetPoint(cikampek, 0, 0);
    expect((await farmerCikampek.postJson("/api/plots", { name: "Petak Push", longitude: pC.longitude, latitude: pC.latitude })).status).toBe(201);

    const retryEndpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    const goneEndpoint = `https://updates.push.services.mozilla.com/wpush/v2/${randomUUID()}`;

    for (const endpoint of [retryEndpoint, goneEndpoint]) {
      expect(
        (
          await farmerCikampek.postJson("/api/push", {
            endpoint,
            keys: { p256dh: "c".repeat(87), auth: "d".repeat(22) },
          })
        ).status,
      ).toBe(200);
    }

    expect(
      (
        await officer.postJson("/api/ppl/broadcasts", {
          id: randomUUID(),
          districtId: cikampek,
          title: "Uji Retry Push",
          body: "Tetap ada di kotak masuk.",
        })
      ).status,
    ).toBe(201);

    // 1. Transient failure on retryEndpoint + 410 Gone on goneEndpoint
    let calls = 0;
    await deliverPush(async (subscription) => {
      calls += 1;
      if (subscription.endpoint === goneEndpoint) {
        throw new WebPushError("Gone", 410, {}, "", "");
      }
      throw new WebPushError("Too Many Requests", 429, {}, "", "");
    });
    expect(calls).toBe(2);

    // goneEndpoint subscription & job deleted, but inbox alert remains intact
    expect(await db().pushSubscription.count({ where: { endpoint: goneEndpoint } })).toBe(0);
    expect(await db().alertRecipient.count({ where: { ownerId: accCikampek.id } })).toBe(1);

    // retryEndpoint job incremented attempts=1 and scheduled ~60s in future (done_at still null)
    const jobAfterFirstFail = await db().pushJob.findFirstOrThrow({ where: { endpoint: retryEndpoint } });
    expect(jobAfterFirstFail.attempts).toBe(1);
    expect(jobAfterFirstFail.doneAt).toBeNull();
    expect(jobAfterFirstFail.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 45_000);

    // Calling deliverPush immediately does NOT re-send before next_attempt_at
    let prematureCalls = 0;
    await deliverPush(async () => {
      prematureCalls += 1;
      return { statusCode: 201, headers: {}, body: "" };
    });
    expect(prematureCalls).toBe(0);

    // Simulate retries until max attempts reached (attempts >= 5 before increment -> marks done_at)
    for (let attempt = 1; attempt <= 5; attempt++) {
      await db().pushJob.updateMany({
        where: { endpoint: retryEndpoint },
        data: { nextAttemptAt: new Date(Date.now() - 1000) },
      });
      await deliverPush(async () => {
        throw new Error("Simulated network failure");
      });
    }

    const exhaustedJob = await db().pushJob.findFirstOrThrow({ where: { endpoint: retryEndpoint } });
    expect(exhaustedJob.attempts).toBe(6);
    expect(exhaustedJob.doneAt).not.toBeNull();
    expect(await db().alertRecipient.count({ where: { ownerId: accCikampek.id } })).toBe(1);

    // Inbox remains readable through API
    const inbox = (await (await farmerCikampek.get("/api/alerts")).json()) as Alert[];
    expect(inbox.map((item) => item.title)).toContain("Uji Retry Push");
  });

  test("refreshWeather stubs Open-Meteo, skips within 15m freshness, updates stale data, and preserves old data on failure", async () => {
    let fetchCount = 0;
    let mode: "ok" | "fail" | "invalid" = "ok";
    let currentPayload = {
      time: "2026-11-27T01:00",
      wind_speed_10m: 9.5,
      wind_direction_10m: 135,
      relative_humidity_2m: 81,
    };

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (!target.hostname.endsWith("open-meteo.com")) {
        return originalFetch(input, init);
      }
      fetchCount += 1;
      if (mode === "fail") return new Response("unavailable", { status: 503 });
      if (mode === "invalid") return Response.json({ current: { time: "bad-date" } });
      return Response.json({ current: currentPayload });
    }) as typeof fetch;

    // 1. Initial fetch inserts weather row
    await refreshWeather();
    expect(fetchCount).toBe(1);
    const firstWeather = await getWeather();
    expect(firstWeather).toMatchObject({
      observedAt: "2026-11-27T01:00:00.000Z",
      windSpeed: 9.5,
      windDirection: 135,
      humidity: 81,
    });

    // 2. Within 15-minute freshness window, refreshWeather skips external fetch
    await refreshWeather();
    expect(fetchCount).toBe(1);

    // 3. Backdate fetched_at > 15m -> failure preserves old stored weather data
    const oldFetchedAt = new Date(Date.now() - 20 * 60_000);
    await db().localWeather.update({ where: { onlyRow: true }, data: { fetchedAt: oldFetchedAt } });

    mode = "fail";
    await expect(refreshWeather()).rejects.toThrow("Weather service unavailable");
    expect(fetchCount).toBe(2);
    expect((await getWeather())?.observedAt).toBe("2026-11-27T01:00:00.000Z");

    mode = "invalid";
    await expect(refreshWeather()).rejects.toThrow();
    expect(fetchCount).toBe(3);
    expect((await getWeather())?.observedAt).toBe("2026-11-27T01:00:00.000Z");

    // 4. Recovered Open-Meteo updates stale weather row and exposes via /api/weather
    mode = "ok";
    currentPayload = {
      time: "2026-11-27T01:30",
      wind_speed_10m: 14.2,
      wind_direction_10m: 210,
      relative_humidity_2m: 74,
    };
    await refreshWeather();
    expect(fetchCount).toBe(4);
    const apiWeather = await (await farmerCikampek.get("/api/weather")).json();
    expect(apiWeather).toMatchObject({
      observedAt: "2026-11-27T01:30:00.000Z",
      windSpeed: 14.2,
      windDirection: 210,
      humidity: 74,
    });
  });
});
