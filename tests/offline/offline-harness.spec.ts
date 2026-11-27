import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { db } from "../../lib/server/db";
import { clearRateLimits, createWhatsAppAccount, districtOffsetPoint, resetMutableState, TestSession } from "../integration/helpers/test-kit";

test.afterAll(async () => {
  await db().$disconnect();
});

test("IndexedDB sync queue retains reports on connection failure, isolates accounts, and completes on retry", async ({
  browser,
}) => {
  await resetMutableState();

  const baseURL = process.env.INTEGRATION_BASE_URL ?? "http://127.0.0.1:3101";
  const origin = new URL(baseURL).origin;

  // Provision two verified farmers via API/DB without touching product UI pages
  const apiA = new TestSession(baseURL);
  const apiB = new TestSession(baseURL);
  const accountA = await createWhatsAppAccount(apiA, { name: "Petani Antrean A" });
  const accountB = await createWhatsAppAccount(apiB, { name: "Petani Antrean B" });
  const point = await districtOffsetPoint("32-15-03");
  const photo = await sharp({ create: { width: 24, height: 24, channels: 3, background: { r: 25, g: 90, b: 35 } } })
    .jpeg()
    .toBuffer();

  const { execFileSync } = await import("node:child_process");
  const bundleCode = execFileSync(
    "bun",
    [
      "build",
      "tests/integration/helpers/offline-harness-entry.ts",
      "--target=browser",
      "--format=esm",
    ],
    { encoding: "utf8" },
  );

  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await page.route("**/__offline-harness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/__offline-harness.js"></script></body></html>`,
      }),
    );
    await page.route("**/__offline-harness.js", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript; charset=utf-8",
        body: bundleCode,
      }),
    );

    await page.goto("/__offline-harness");
    await page.waitForFunction(() => Boolean(window.__vektorOffline));

    // Authenticate context as Account A via auth API
    await clearRateLimits();
    const signInA = await page.request.post("/api/auth/sign-in/phone-number", {
      headers: { origin },
      data: { phoneNumber: accountA.phoneNumber, password: accountA.password },
    });
    expect(signInA.ok()).toBe(true);

    const queuedId = randomUUID();
    const observedAt = new Date(Date.now() - 10_000).toISOString();

    await page.evaluate(
      async ({ account, id, observedAt, longitude, latitude, photoBytes }) => {
        const { offlineDb } = window.__vektorOffline;
        const database = offlineDb();
        await database.accounts.put({ key: "account", account });
        await database.queue.put({
          id,
          ownerId: account.id,
          report: {
            id,
            observedAt,
            longitude,
            latitude,
            finding: "blast",
            notes: "Antrean offline",
          },
          photo: new Blob([new Uint8Array(photoBytes)], { type: "image/jpeg" }),
        });
      },
      {
        account: { id: accountA.id, name: accountA.name, role: accountA.role },
        id: queuedId,
        observedAt,
        longitude: point.longitude,
        latitude: point.latitude,
        photoBytes: [...photo],
      },
    );

    // 1. Connection failure keeps report in queue and marks nothing sent
    await page.route("**/api/reports", (route) => route.abort("failed"));
    const failureOutcome = await page.evaluate(async () => {
      const { offlineDb, syncReports } = window.__vektorOffline;
      let threw = false;
      try {
        await syncReports();
      } catch {
        threw = true;
      }
      const database = offlineDb();
      return {
        threw,
        queue: await database.queue.toArray(),
        sent: await database.sent.toArray(),
      };
    });
    expect(failureOutcome.threw).toBe(true);
    expect(
      failureOutcome.queue.map((item) => ({
        id: item.id,
        ownerId: item.ownerId,
        claimedUntil: item.claimedUntil,
        error: item.error,
      })),
    ).toEqual([{ id: queuedId, ownerId: accountA.id, claimedUntil: undefined, error: undefined }]);
    expect(failureOutcome.sent).toEqual([]);
    expect(await db().report.count()).toBe(0);
    await page.unroute("**/api/reports");

    // 2. Switching session to Account B must NOT send Account A's queued report
    await clearRateLimits();
    const signInB = await page.request.post("/api/auth/sign-in/phone-number", {
      headers: { origin },
      data: { phoneNumber: accountB.phoneNumber, password: accountB.password },
    });
    expect(signInB.ok()).toBe(true);

    let reportsPostCount = 0;
    await page.route("**/api/reports", (route) => {
      reportsPostCount += 1;
      return route.continue();
    });

    await page.evaluate(
      async ({ account }) => {
        const { offlineDb, syncReports } = window.__vektorOffline;
        await offlineDb().accounts.put({ key: "account", account });
        await syncReports();
      },
      { account: { id: accountB.id, name: accountB.name, role: accountB.role } },
    );
    expect(reportsPostCount).toBe(0);
    expect(await db().report.count()).toBe(0);
    await page.unroute("**/api/reports");

    // 3. Returning to Account A with working connection delivers the queued report and marks it sent
    await clearRateLimits();
    const reloginA = await page.request.post("/api/auth/sign-in/phone-number", {
      headers: { origin },
      data: { phoneNumber: accountA.phoneNumber, password: accountA.password },
    });
    expect(reloginA.ok()).toBe(true);

    const syncedOutcome = await page.evaluate(
      async ({ account }) => {
        const { offlineDb, syncReports } = window.__vektorOffline;
        const database = offlineDb();
        await database.accounts.put({ key: "account", account });
        await syncReports();
        return {
          queue: await database.queue.toArray(),
          sent: await database.sent.toArray(),
        };
      },
      { account: { id: accountA.id, name: accountA.name, role: accountA.role } },
    );
    expect(syncedOutcome.queue).toEqual([]);
    expect(syncedOutcome.sent).toHaveLength(1);
    expect(syncedOutcome.sent[0]).toMatchObject({ id: queuedId, ownerId: accountA.id });
    expect(await db().report.count({ where: { ownerId: accountA.id, clientId: queuedId } })).toBe(1);

    // 4. Non-retryable 422 response records error on queue item instead of dropping it
    const badId = randomUUID();
    await page.evaluate(
      async ({ account, id, photoBytes }) => {
        const { offlineDb, syncReports } = window.__vektorOffline;
        const database = offlineDb();
        await database.queue.put({
          id,
          ownerId: account.id,
          report: {
            id,
            observedAt: new Date(Date.now() - 5000).toISOString(),
            longitude: 107.6191,
            latitude: -6.9175,
            finding: "blast",
            notes: "Luar wilayah",
          },
          photo: new Blob([new Uint8Array(photoBytes)], { type: "image/jpeg" }),
        });
        await syncReports();
      },
      { account: { id: accountA.id, name: accountA.name, role: accountA.role }, id: badId, photoBytes: [...photo] },
    );
    const badQueueItem = await page.evaluate(async (id) => window.__vektorOffline.offlineDb().queue.get(id), badId);
    expect(badQueueItem?.error).toContain("Karawang");
  } finally {
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
  }
});
