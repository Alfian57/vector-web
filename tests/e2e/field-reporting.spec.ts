import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { devices, expect, test } from "@playwright/test";
import sharp from "sharp";
import type { FollowUpEntry, Page, RadarSnapshot, ReviewEntry } from "../../lib/domain";
import type { QueuedReport } from "../../lib/pwa/storage";
import { db } from "../../lib/server/db";
import { deliverPush } from "../../lib/server/jobs";
import { account, baseURL, createPhoneGenerator, origin, password, receivedCode } from "./helpers/pilot-fixtures";

const phone = createPhoneGenerator(0);
const verified = { status: "verified", finding: "blast", severity: "mild", note: "" };

test.afterAll(async () => {
  await db().$disconnect();
});

test("mobile offline reporting, private photos, live review and area alerts", async ({ browser }) => {
  test.setTimeout(180_000);
  const mobile = await browser.newContext({ ...devices["Pixel 7"], baseURL });
  const other = await browser.newContext({ baseURL });
  const staff = await browser.newContext({ baseURL });
  const mobilePage = await mobile.newPage();
  const officerPage = await staff.newPage();
  const phones = [phone(), phone(), phone()];
  const [point] = await db().$queryRaw<{ id: string; name: string; longitude: number; latitude: number }[]>`
    SELECT id, name, ST_X(location) AS longitude, ST_Y(location) AS latitude FROM (
      SELECT id, name, ST_PointOnSurface(geom) AS location FROM districts WHERE id = '32-15-03'
    ) pilot
  `;
  const photo = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 24, g: 79, b: 39 } },
  })
    .jpeg()
    .toBuffer();
  try {
    await mobilePage.goto("/");
    await expect(mobilePage.getByRole("heading", { name: "Pantau temuan padi dari lahan" })).toBeVisible();
    await expect(
      mobilePage
        .getByRole("region", { name: "Pantau temuan padi dari lahan" })
        .getByRole("link", { name: "Buka Radar" }),
    ).toHaveAttribute("href", "/radar");
    await mobilePage.getByRole("link", { name: "Masuk" }).click();
    await expect(mobilePage.getByLabel("Nomor WhatsApp atau email")).toHaveAttribute(
      "placeholder",
      "Contoh: 081234567890",
    );
    await expect(
      mobilePage.locator("label").filter({ hasText: "Nomor WhatsApp atau email" }).locator(".field-required"),
    ).toHaveText("*");
    await mobilePage.getByRole("button", { name: "Daftar akun petani" }).click();
    await mobilePage.getByLabel("Nomor WhatsApp").fill(phones[0]);
    await mobilePage.getByRole("button", { name: "Kirim kode WhatsApp", exact: true }).click();
    await expect(mobilePage.getByRole("status").filter({ hasText: "Kode verifikasi dikirim" })).toBeVisible({
      timeout: 15_000,
    });
    await mobilePage.getByLabel("Kode WhatsApp").fill(await receivedCode(phones[0]));
    await mobilePage.getByLabel("Nama").fill("Petani uji");
    await mobilePage.getByLabel("Kata sandi").fill(password);
    await mobilePage.getByRole("button", { name: "Buat akun", exact: true }).click();
    await expect(mobilePage).toHaveURL(/\/radar$/);
    await expect(mobilePage.getByRole("heading", { name: "Radar hama tanaman" })).toBeVisible();
    await expect(mobilePage.getByText("Petani uji", { exact: true })).toBeVisible();
    const owner = (await (await mobile.request.get("/api/session")).json()) as { id: string };

    await account(other, phones[1], "Petani lain");
    await account(staff, phones[2], "PPL uji", true);
    const deniedDashboard = await other.request.get("/ppl", { maxRedirects: 0 });
    expect(deniedDashboard.status()).toBe(307);
    expect(new URL(deniedDashboard.headers().location, baseURL).searchParams.get("notice")).toBe("ppl-required");
    await officerPage.goto("/ppl");
    await expect(officerPage.getByText("Terhubung langsung")).toBeVisible();
    await officerPage
      .getByRole("navigation", { name: "Navigasi PPL" })
      .getByRole("link", { name: "Antrean laporan" })
      .click();
    await expect(officerPage).toHaveURL(/\/ppl\/reports$/);
    expect((await other.request.get("/api/ppl/events")).status()).toBe(403);

    const add = await mobile.request.post("/api/plots", {
      headers: origin,
      data: { name: "Petak uji", longitude: point.longitude, latitude: point.latitude },
    });
    expect(add.status(), await add.text()).toBe(201);
    await mobilePage.getByRole("button", { name: "Siapkan offline" }).click();
    await expect(mobilePage.getByText("Peta Karawang siap dibuka offline.")).toBeVisible({ timeout: 25_000 });
    await expect(mobilePage.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect
      .poll(async () => (await mobilePage.locator(".map-canvas").boundingBox())?.height ?? 0)
      .toBeGreaterThan(250);

    await mobile.setOffline(true);
    await mobilePage.goto("/");
    await expect(mobilePage.getByRole("heading", { name: "Pantau temuan padi dari lahan" })).toBeVisible();
    await mobilePage
      .getByRole("navigation", { name: "Navigasi beranda" })
      .getByRole("link", { name: "Tanya jawab" })
      .click();
    await expect(mobilePage).toHaveURL(/#faq$/);
    const question = mobilePage.getByText("Apakah saya perlu membuat akun?", { exact: true });
    await question.focus();
    await mobilePage.keyboard.press("Enter");
    await expect(mobilePage.getByText("Masuk untuk membuka radar", { exact: false })).toBeVisible();
    await mobilePage
      .getByRole("region", { name: "Mulai dari radar Karawang" })
      .getByRole("link", { name: "Buka Radar" })
      .click();
    await expect(mobilePage).toHaveURL(/\/radar$/);
    await mobilePage.reload();
    await expect(mobilePage.getByText("Offline", { exact: true })).toBeVisible();
    await expect(mobilePage.getByText("Tersimpan di perangkat", { exact: true })).toBeVisible();
    await expect(mobilePage.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect(mobilePage.getByText("Memuat peta Karawang…")).toBeHidden();
    await expect(mobilePage.getByText("Peta dasar belum dapat dimuat.")).toBeHidden();
    await mobilePage
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", { name: "Laporan", exact: true })
      .click();
    await mobilePage.getByRole("button", { name: "Buat laporan" }).click();
    await expect(mobilePage.getByText("Catatan gejala (opsional)")).toBeVisible();
    await expect(mobilePage.getByLabel("Lintang")).toHaveAttribute("placeholder", "Contoh: -6.33755");
    await expect(mobilePage.getByLabel("Waktu pengamatan")).toHaveAccessibleDescription(
      "Pilih tanggal dan jam saat temuan diamati.",
    );
    await expect(mobilePage.getByLabel("Pilih dari galeri")).toHaveAccessibleDescription(
      "Ambil satu foto daun atau pilih foto dari galeri.",
    );
    await mobilePage
      .getByLabel("Pilih dari galeri")
      .setInputFiles({ name: "daun.jpg", mimeType: "image/jpeg", buffer: photo });
    await expect(mobilePage.getByText("Analisis foto belum tersedia.", { exact: false })).toBeVisible();
    await mobilePage.evaluate(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
        configurable: true,
        value: (_found: unknown, denied: (error: { code: number }) => void) => denied({ code: 1 }),
      });
    });
    await mobilePage.getByRole("button", { name: "Gunakan GPS" }).click();
    await expect(mobilePage.getByText("Lokasi belum ditemukan. Pilih pin atau isi koordinat.")).toBeVisible();
    await mobilePage.getByRole("button", { name: "Pilih pin di peta" }).click();
    await mobilePage.locator(".map-picker canvas").click({ position: { x: 150, y: 130 } });
    await expect(mobilePage.getByLabel("Lintang")).not.toHaveValue("");
    await mobilePage.getByLabel("Lintang").fill(String(point.latitude));
    await mobilePage.getByLabel("Bujur").fill(String(point.longitude));
    await mobilePage.getByLabel("Catatan gejala").fill("Laporan offline");
    await mobilePage.getByRole("button", { name: "Simpan laporan" }).click();
    await expect(mobilePage.getByText("Menunggu sinkronisasi")).toBeVisible();
    await expect(mobilePage).toHaveURL(/\/radar\/reports(?:\?|$)/);
    const queuedId = await mobilePage.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const open = indexedDB.open("vektor");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const database = open.result;
            const transaction = database.transaction("queue", "readwrite");
            const lookup = transaction.objectStore("queue").openCursor();
            let id = "";
            lookup.onsuccess = () => {
              const cursor = lookup.result;
              if (!cursor) return;
              const report = cursor.value as QueuedReport;
              id = report.id;
              cursor.update({ ...report, error: "Periksa kembali data laporan." });
            };
            transaction.oncomplete = () => {
              database.close();
              if (id) resolve(id);
              else reject(new Error("Queued report fixture is missing"));
            };
            transaction.onabort = () => reject(transaction.error);
          };
        }),
    );
    await mobilePage.reload();
    await mobilePage.getByRole("link", { name: "Perbaiki", exact: true }).click();
    await expect(mobilePage).toHaveURL(`/radar/reports/${queuedId}/edit`);
    await mobilePage.reload();
    await expect(mobilePage.getByLabel("Catatan gejala")).toHaveValue("Laporan offline");
    await mobilePage.getByLabel("Catatan gejala").fill("Laporan offline diperbaiki");
    await mobilePage.getByRole("button", { name: "Simpan laporan" }).click();
    await expect(
      mobilePage.getByRole("table", { name: "Antrean perangkat" }).getByText("Menunggu sinkronisasi"),
    ).toBeVisible();
    await mobilePage.reload();
    await mobilePage.getByRole("link", { name: "Laporan", exact: true }).click();
    await expect(mobilePage.getByText("Menunggu sinkronisasi")).toBeVisible();
    await expect(mobilePage.getByText("Riwayat laporan terkirim tersedia saat perangkat terhubung.")).toBeVisible();
    await expect(mobilePage.getByText("Memuat laporan…")).toBeHidden();

    await db().session.updateMany({ where: { userId: owner.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    await mobile.setOffline(false);
    await expect(mobilePage).toHaveURL(
      (url) => url.pathname === "/masuk" && url.searchParams.get("next") === "/radar/reports",
    );
    expect(await db().report.count({ where: { ownerId: owner.id } })).toBe(0);

    async function loginInBrowser(recipient: string) {
      await mobilePage.goto("/masuk");
      await mobilePage.getByLabel("Nomor WhatsApp atau email").fill(recipient);
      await mobilePage.getByLabel("Kata sandi").fill(password);
      const signIn = async () => {
        const response = mobilePage.waitForResponse(
          (item) => new URL(item.url()).pathname === "/api/auth/sign-in/phone-number",
        );
        await mobilePage.getByRole("button", { name: "Masuk", exact: true }).click();
        return response;
      };
      let response = await signIn();
      if (response.status() === 429) {
        const retryAfter = Number(response.headers()["x-retry-after"] ?? "10");
        await delay((retryAfter + 1) * 1000);
        response = await signIn();
      }
      expect(response.ok()).toBe(true);
      await mobilePage.getByRole("link", { name: "Laporan", exact: true }).click({ timeout: 15_000 });
    }

    await loginInBrowser(phones[1]);
    await expect(mobilePage.getByText("Antrean kosong.")).toBeVisible();
    await expect(mobilePage.getByText("Menunggu sinkronisasi")).toBeHidden();
    await loginInBrowser(phones[0]);
    await expect(mobilePage.getByText("Antrean kosong.")).toBeVisible({ timeout: 25_000 });
    await expect(officerPage.getByRole("link", { name: `Tinjau Belum diketahui di ${point.name}` })).toBeVisible({
      timeout: 12_000,
    });
    const pending = (await (await mobile.request.get("/api/reports")).json()) as { reports: { id: string }[] };
    expect(pending.reports).toHaveLength(1);
    const first = pending.reports[0].id;
    expect((await mobile.request.get(`/api/reports/${first}/photo`)).status()).toBe(200);
    expect((await other.request.get(`/api/reports/${first}/photo`)).status()).toBe(404);
    expect(
      (await other.request.patch(`/api/reports/${first}/review`, { headers: origin, data: verified })).status(),
    ).toBe(403);

    await officerPage.getByRole("link", { name: `Tinjau Belum diketahui di ${point.name}` }).click();
    await expect(officerPage.getByAltText("Foto daun dari laporan petani")).toBeVisible();
    await expect(officerPage.getByLabel("Keputusan")).toHaveValue("");
    await officerPage.getByLabel("Keputusan").selectOption("rejected");
    await expect(officerPage.getByLabel("Alasan penolakan")).toHaveAttribute("required", "");
    await officerPage.getByRole("button", { name: "Tolak laporan" }).click();
    await expect(officerPage.getByLabel("Alasan penolakan")).toBeFocused();
    await officerPage.getByLabel("Keputusan").selectOption("verified");
    await expect(officerPage.getByText("Catatan verifikasi (opsional)")).toBeVisible();
    await officerPage.getByLabel("Temuan terverifikasi").selectOption("blast");
    await officerPage.getByLabel("Keparahan").selectOption("mild");
    await officerPage.getByRole("button", { name: "Verifikasi laporan" }).click();
    await expect(officerPage.getByText("Keputusan verifikasi tersimpan.")).toBeVisible();

    async function submit(id: string, longitude: number, observedAt: Date) {
      return mobile.request.post("/api/reports", {
        headers: { ...origin, "x-vektor-account": owner.id },
        multipart: {
          report: JSON.stringify({
            id,
            longitude,
            latitude: point.latitude,
            observedAt: observedAt.toISOString(),
            finding: "blast",
            notes: "",
          }),
          photo: { name: "daun.jpg", mimeType: "image/jpeg", buffer: photo },
        },
      });
    }
    async function approve(id: string) {
      return staff.request.patch(`/api/reports/${id}/review`, { headers: origin, data: verified });
    }
    async function addReport(longitude: number, date = new Date(Date.now() - 3000)) {
      const response = await submit(randomUUID(), longitude, date);
      expect(response.status(), await response.text()).toBe(201);
      return ((await response.json()) as { id: string }).id;
    }

    const id = randomUUID();
    const time = new Date(Date.now() - 3000);
    const repeated = await Promise.all([
      submit(id, point.longitude + 0.0005, time),
      submit(id, point.longitude + 0.0005, time),
    ]);
    expect(repeated.map((response) => response.status()).sort()).toEqual([200, 201]);
    const second = ((await repeated[0].json()) as { id: string }).id;
    expect(((await repeated[1].json()) as { id: string }).id).toBe(second);
    const decisions = await Promise.all([approve(second), approve(second)]);
    expect(decisions.map((response) => response.status()).sort()).toEqual([200, 409]);

    const old = await addReport(point.longitude, new Date(Date.now() - 8 * 86_400_000));
    expect((await approve(old)).status()).toBe(200);
    const far = await addReport(point.longitude + 0.008);
    expect((await approve(far)).status()).toBe(200);
    const before = (await (await mobile.request.get("/api/radar")).json()) as {
      summaries: { id: string; clustered: boolean }[];
    };
    expect(before.summaries.find((row) => row.id === point.id)?.clustered).toBe(false);
    const third = await addReport(point.longitude + 0.001);
    const start = performance.now();
    const reviewed = await approve(third);
    const milliseconds = Math.round(performance.now() - start);
    expect(reviewed.status(), await reviewed.text()).toBe(200);
    console.log(`Aktivasi klaster tiga laporan, respons API: ${milliseconds} ms`);
    await expect
      .poll(async () => ((await (await mobile.request.get("/api/alerts")).json()) as unknown[]).length)
      .toBe(1);
    expect(await (await other.request.get("/api/alerts")).json()).toEqual([]);

    const radar = (await (await mobile.request.get("/api/radar")).json()) as RadarSnapshot;
    expect(radar.summaries.find((row) => row.id === point.id)).toMatchObject({ clustered: true, count: 4 });
    expect(JSON.stringify(radar)).not.toMatch(/latitude|longitude|ownerId/);
    expect(radar.trend).toHaveLength(4);
    expect(radar.trend?.reduce((total, week) => total + week.count, 0)).toBe(5);
    const another = await addReport(point.longitude + 0.0002);
    expect((await approve(another)).status()).toBe(200);
    expect(await (await mobile.request.get("/api/alerts")).json()).toHaveLength(1);

    await officerPage.goto("/ppl/follow-ups/broadcast");
    let dropped = false;
    await officerPage.route("**/api/ppl/broadcasts", async (route) => {
      if (dropped) return route.continue();
      dropped = true;
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      await route.abort();
    });
    await officerPage.getByLabel("Kecamatan tujuan").selectOption(point.id);
    await officerPage.getByLabel("Judul siaran").fill("Siaran PPL");
    await officerPage.getByLabel("Isi siaran").fill("Periksa petak pantauan Anda.");
    await officerPage.getByRole("button", { name: "Kirim siaran" }).click();
    await expect(officerPage.getByText("Koneksi atau penyimpanan tidak tersedia. Coba lagi.")).toBeVisible();
    await officerPage.getByRole("button", { name: "Kirim siaran" }).click();
    await expect(officerPage.getByText("Siaran dikirim ke kotak masuk wilayah.")).toBeVisible();
    await officerPage.unroute("**/api/ppl/broadcasts");
    await mobilePage.getByRole("button", { name: /Notifikasi/ }).click();
    await expect(mobilePage.getByText("Siaran PPL")).toHaveCount(1);
    await expect(mobilePage.getByText("Siaran PPL")).toBeVisible();
    await expect(mobilePage.getByText("Klaster terverifikasi")).toBeVisible();
    await mobilePage.evaluate(() => {
      Object.defineProperty(Notification, "requestPermission", { configurable: true, value: async () => "denied" });
    });
    await mobilePage.getByRole("button", { name: "Aktifkan" }).click();
    await expect(mobilePage.getByText("Izin notifikasi belum diberikan.", { exact: false })).toBeVisible();

    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    await mobilePage.evaluate(async (endpoint) => {
      await navigator.serviceWorker.ready;
      let active = false;
      const subscription = {
        endpoint,
        toJSON: () => ({ endpoint, keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) } }),
        unsubscribe: async () => {
          active = false;
          return true;
        },
      };
      Object.defineProperty(Notification, "requestPermission", { configurable: true, value: async () => "granted" });
      Object.defineProperty(PushManager.prototype, "getSubscription", {
        configurable: true,
        value: async () => (active ? subscription : null),
      });
      Object.defineProperty(PushManager.prototype, "subscribe", {
        configurable: true,
        value: async () => {
          active = true;
          return subscription;
        },
      });
    }, endpoint);
    await mobilePage.getByRole("button", { name: "Aktifkan" }).click();
    await expect(mobilePage.getByText("Notifikasi perangkat diaktifkan.")).toBeVisible();
    const ownsPush = { headers: origin, data: { endpoint } };
    expect(await (await mobile.request.post("/api/push/status", ownsPush)).json()).toEqual({ subscribed: true });
    expect(await (await other.request.post("/api/push/status", ownsPush)).json()).toEqual({ subscribed: false });
    const pushInput = {
      id: randomUUID(),
      districtId: point.id,
      title: "Uji antrean notifikasi",
      body: "Isi peringatan hanya di kotak masuk.",
    };
    const sendPushBroadcast = () => staff.request.post("/api/ppl/broadcasts", { headers: origin, data: pushInput });
    const pushBroadcasts = await Promise.all([sendPushBroadcast(), sendPushBroadcast()]);
    expect(pushBroadcasts.map((result) => result.status()).sort()).toEqual([200, 201]);
    expect(
      (
        await staff.request.post("/api/ppl/broadcasts", {
          headers: origin,
          data: { ...pushInput, title: "Judul lain" },
        })
      ).status(),
    ).toBe(409);
    const sentPush: { endpoint: string; payload: unknown }[] = [];
    await deliverPush(async (subscription, payload) => {
      sentPush.push({ endpoint: subscription.endpoint, payload: JSON.parse(String(payload)) });
      return { statusCode: 201, headers: {}, body: "" };
    });
    const [job] = await db().$queryRaw<{ alertId: string; done: boolean }[]>`
      SELECT alert_id AS "alertId", done_at IS NOT NULL AS done FROM push_jobs WHERE endpoint = ${endpoint}
    `;
    expect(job?.done).toBe(true);
    expect(sentPush).toEqual([{ endpoint, payload: { id: job.alertId } }]);
    await mobilePage.getByRole("button", { name: "Matikan" }).click();
    await expect(mobilePage.getByText("Notifikasi perangkat dinonaktifkan.")).toBeVisible();
    expect(await (await mobile.request.post("/api/push/status", ownsPush)).json()).toEqual({ subscribed: false });

    await officerPage.getByRole("link", { name: "Kembali ke tindak lanjut" }).click();
    await officerPage.getByRole("link", { name: "Catat tindak lanjut" }).click();
    await expect(officerPage).toHaveURL(/\/ppl\/follow-ups\/create$/);
    await officerPage.getByLabel("Kecamatan tindak lanjut").selectOption(point.id);
    await officerPage.getByLabel("Jenis").selectOption("outreach");
    await officerPage.getByLabel("Status tindak lanjut").selectOption("planned");
    await officerPage.getByLabel("Catatan tindak lanjut").fill("Kunjungan uji");
    await officerPage.getByRole("button", { name: "Simpan tindak lanjut" }).click();
    await expect(officerPage.getByText("Tindak lanjut tersimpan.")).toBeVisible();
    await officerPage.getByRole("link", { name: "Kembali ke tindak lanjut" }).click();
    await expect(
      officerPage.getByRole("table", { name: "Tindak lanjut per kecamatan" }).getByText("Kunjungan uji"),
    ).toBeVisible({ timeout: 12_000 });
    const followUp = {
      id: randomUUID(),
      districtId: point.id,
      kind: "outreach",
      status: "complete",
      note: "Kunjungan selesai",
    };
    for (let repeat = 0; repeat < 2; repeat++) {
      expect((await staff.request.put("/api/ppl/follow-ups", { headers: origin, data: followUp })).status()).toBe(200);
    }
    const followPath = "/api/ppl/follow-ups/history";
    expect((await mobile.request.get(followPath)).status()).toBe(403);
    const followHistory = (await (await staff.request.get(followPath)).json()) as Page<FollowUpEntry>;
    expect(followHistory.entries.map((entry) => entry.note)).toEqual(["Kunjungan selesai", "Kunjungan uji"]);
    await expect(
      officerPage.getByRole("table", { name: "Riwayat tindak lanjut" }).getByText("Kunjungan uji"),
    ).toBeVisible();

    await officerPage
      .getByRole("navigation", { name: "Navigasi PPL" })
      .getByRole("link", { name: "Antrean laporan" })
      .click();
    await officerPage.getByLabel("Status laporan").selectOption("verified");
    await officerPage
      .getByRole("link", { name: `Tinjau Blas daun di ${point.name}` })
      .first()
      .click();
    await officerPage.getByRole("link", { name: "Koreksi keputusan" }).click();
    await officerPage.getByLabel("Keparahan").selectOption("severe");
    await officerPage.getByLabel("Alasan koreksi keputusan").fill("Kondisi rumpun diperiksa kembali");
    await officerPage.getByRole("button", { name: "Simpan koreksi keputusan" }).click();
    await expect(
      officerPage.getByRole("table", { name: "Riwayat verifikasi" }).getByText("Kondisi rumpun diperiksa kembali"),
    ).toBeVisible();
    const reportsPage = await mobile.newPage();
    await reportsPage.goto("/radar/reports");
    const sentReports = reportsPage.getByRole("table", { name: "Laporan terkirim" });
    await expect(sentReports.getByRole("columnheader", { name: "Saran tindak lanjut" })).toBeVisible();
    await expect(sentReports.getByRole("cell", { name: /Periksa kembali petak/ }).first()).toBeVisible();
    await reportsPage.close();
    const reviews = `/api/reports/${another}/reviews`;
    await expect
      .poll(async () => ((await (await staff.request.get(reviews)).json()) as Page<ReviewEntry>).entries.length)
      .toBe(2);
    const reviewHistory = (await (await staff.request.get(reviews)).json()) as Page<ReviewEntry>;
    expect(reviewHistory.entries).toMatchObject([
      { severity: "severe", reason: "Kondisi rumpun diperiksa kembali" },
      { severity: "mild" },
    ]);
    expect((await mobile.request.get(reviews)).status()).toBe(403);
    const corrected = {
      status: "rejected",
      revision: 1,
      note: "Laporan perlu dibuat ulang",
      reason: "Sumber laporan diperiksa kembali",
    };
    expect((await staff.request.patch(reviews, { headers: origin, data: corrected })).status()).toBe(409);
    for (const id of [third, second]) {
      expect(
        (await staff.request.patch(`/api/reports/${id}/reviews`, { headers: origin, data: corrected })).status(),
      ).toBe(200);
    }
    const recomputed = (await (await mobile.request.get("/api/radar")).json()) as RadarSnapshot;
    expect(recomputed.summaries.find((row) => row.id === point.id)).toMatchObject({ clustered: false, count: 3 });
    expect((await (await mobile.request.get("/api/alerts")).json()) as unknown[]).toContainEqual(
      expect.objectContaining({ title: "Koreksi data radar" }),
    );

    await mobilePage.getByRole("button", { name: "Aktifkan" }).click();
    await expect(mobilePage.getByText("Notifikasi perangkat diaktifkan.")).toBeVisible();
    await mobilePage.route("**/api/push", (route) =>
      route.fulfill({ status: 503, json: { message: "Pembersihan notifikasi gagal." } }),
    );
    const signedOut = mobilePage.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/auth/sign-out",
    );
    await mobilePage.getByRole("button", { name: "Keluar", exact: true }).click();
    expect((await signedOut).ok()).toBe(true);
    await expect(mobilePage.getByText("Petani uji", { exact: true })).toBeHidden();
    expect(await (await mobile.request.get("/api/session")).json()).toBeNull();
  } finally {
    await Promise.all([mobile.close(), other.close(), staff.close()]);
  }
});
