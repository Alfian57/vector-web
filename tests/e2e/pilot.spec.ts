import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { devices, expect, test, type BrowserContext } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import type { AidAllocations, AidCorrection, AidHistory, FollowUpEntry, Page, RadarSnapshot, ReviewEntry } from "../../lib/domain";
import { db } from "../../lib/server/db";
import { deliverPush } from "../../lib/server/jobs";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const fonnte = process.env.FONNTE_TEST_URL ?? "http://127.0.0.1:18080/send";
const password = "test-password-2026";
const origin = { origin: new URL(baseURL).origin };
const verified = { status: "verified", finding: "blast", severity: "mild", note: "" };

let nextNumber = 0;
function phone() { return `+120255501${String(nextNumber++).padStart(2, "0")}`; }

async function receivedCode(recipient: string, purpose = "verifikasi akun") {
  const url = new URL("/messages", fonnte);
  url.searchParams.set("target", recipient.slice(1));
  let code = "";
  await expect.poll(async () => {
    const response = await fetch(url);
    const { message } = await response.json() as { message: string | null };
    code = message?.match(new RegExp(`${purpose}: (\\d{6})`))?.[1] ?? "";
    return Boolean(code);
  }, { timeout: 10_000 }).toBe(true);
  return code;
}

async function account(context: BrowserContext, recipient: string, name: string, officer = false) {
  const sent = await context.request.post("/api/auth/phone-number/send-otp", { headers: origin, data: { phoneNumber: recipient } });
  expect(sent.ok(), await sent.text()).toBeTruthy();
  const registered = await context.request.post("/api/auth/whatsapp/register", {
    headers: origin,
    data: { phoneNumber: recipient, code: await receivedCode(recipient), password, name, role: "officer" },
  });
  expect(registered.ok(), await registered.text()).toBeTruthy();
  if (officer) await db().user.update({ where: { phoneNumber: recipient }, data: { role: "officer" } });
  const signedIn = await context.request.post("/api/auth/sign-in/phone-number", { headers: origin, data: { phoneNumber: recipient, password } });
  expect(signedIn.ok(), await signedIn.text()).toBeTruthy();
  const session = await context.request.get("/api/session");
  expect(session.ok()).toBeTruthy();
  const data = await session.json() as { id: string; role: string };
  expect(data.role).toBe(officer ? "officer" : "farmer");
  return data;
}

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
  }).jpeg().toBuffer();
  try {
    await mobilePage.goto("/");
    await expect(mobilePage.getByRole("heading", { name: "Pantau temuan padi dari lahan" })).toBeVisible();
    await expect(mobilePage.getByRole("region", { name: "Pantau temuan padi dari lahan" }).getByRole("link", { name: "Buka Radar" })).toHaveAttribute("href", "/radar");
    await mobilePage.getByRole("link", { name: "Masuk" }).click();
    await expect(mobilePage.getByLabel("Nomor WhatsApp atau email")).toHaveAttribute("placeholder", "Contoh: 081234567890");
    await expect(mobilePage.locator("label").filter({ hasText: "Nomor WhatsApp atau email" }).locator(".field-required")).toHaveText("*");
    await mobilePage.getByRole("button", { name: "Daftar akun petani" }).click();
    await mobilePage.getByLabel("Nomor WhatsApp").fill(phones[0]);
    await mobilePage.getByRole("button", { name: "Kirim kode WhatsApp", exact: true }).click();
    await expect(mobilePage.getByRole("status").filter({ hasText: "Kode verifikasi dikirim" })).toBeVisible({ timeout: 15_000 });
    await mobilePage.getByLabel("Kode WhatsApp").fill(await receivedCode(phones[0]));
    await mobilePage.getByLabel("Nama").fill("Petani uji");
    await mobilePage.getByLabel("Kata sandi").fill(password);
    await mobilePage.getByRole("button", { name: "Buat akun", exact: true }).click();
    await expect(mobilePage).toHaveURL(/\/radar$/);
    await expect(mobilePage.getByRole("heading", { name: "Radar hama tanaman" })).toBeVisible();
    await expect(mobilePage.getByText("Petani uji", { exact: true })).toBeVisible();
    const owner = await (await mobile.request.get("/api/session")).json() as { id: string };

    await account(other, phones[1], "Petani lain");
    await account(staff, phones[2], "PPL uji", true);
    const deniedDashboard = await other.request.get("/ppl", { maxRedirects: 0 });
    expect(deniedDashboard.status()).toBe(307);
    expect(new URL(deniedDashboard.headers().location, baseURL).searchParams.get("notice")).toBe("ppl-required");
    await officerPage.goto("/ppl");
    await expect(officerPage.getByText("Terhubung langsung")).toBeVisible();
    expect((await other.request.get("/api/ppl/events")).status()).toBe(403);

    const add = await mobile.request.post("/api/plots", {
      headers: origin, data: { name: "Petak uji", longitude: point.longitude, latitude: point.latitude },
    });
    expect(add.status(), await add.text()).toBe(201);
    await mobilePage.getByRole("button", { name: "Siapkan offline" }).click();
    await expect(mobilePage.getByText("Peta Karawang siap dibuka offline.")).toBeVisible({ timeout: 25_000 });
    await expect(mobilePage.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect.poll(async () => (await mobilePage.locator(".map-canvas").boundingBox())?.height ?? 0).toBeGreaterThan(250);

    await mobile.setOffline(true);
    await mobilePage.goto("/");
    await expect(mobilePage.getByRole("heading", { name: "Pantau temuan padi dari lahan" })).toBeVisible();
    await mobilePage.getByRole("navigation", { name: "Navigasi beranda" }).getByRole("link", { name: "Tanya jawab" }).click();
    await expect(mobilePage).toHaveURL(/#faq$/);
    const question = mobilePage.getByText("Apakah saya perlu membuat akun?", { exact: true });
    await question.focus();
    await mobilePage.keyboard.press("Enter");
    await expect(mobilePage.getByText("Masuk untuk membuka radar", { exact: false })).toBeVisible();
    await mobilePage.getByRole("region", { name: "Mulai dari radar Karawang" }).getByRole("link", { name: "Buka Radar" }).click();
    await expect(mobilePage).toHaveURL(/\/radar$/);
    await mobilePage.reload();
    await expect(mobilePage.getByText("Offline", { exact: true })).toBeVisible();
    await expect(mobilePage.getByText("Peta Karawang sudah tersimpan di perangkat ini.")).toBeVisible();
    await expect(mobilePage.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect(mobilePage.getByText("Memuat peta Karawang…")).toBeHidden();
    await expect(mobilePage.getByText("Peta dasar belum dapat dimuat.")).toBeHidden();
    await mobilePage.getByRole("button", { name: "Buat laporan" }).click();
    await expect(mobilePage.getByText("Catatan gejala (opsional)")).toBeVisible();
    await expect(mobilePage.getByLabel("Lintang")).toHaveAttribute("placeholder", "Contoh: -6.33755");
    await expect(mobilePage.getByLabel("Waktu pengamatan")).toHaveAccessibleDescription("Pilih tanggal dan jam saat temuan diamati.");
    await expect(mobilePage.getByLabel("Pilih dari galeri")).toHaveAccessibleDescription("Ambil satu foto daun atau pilih foto dari galeri.");
    await mobilePage.getByLabel("Pilih dari galeri").setInputFiles({ name: "daun.jpg", mimeType: "image/jpeg", buffer: photo });
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
    await mobilePage.reload();
    await mobilePage.getByRole("button", { name: "Laporan", exact: true }).click();
    await expect(mobilePage.getByText("Menunggu sinkronisasi")).toBeVisible();
    await expect(mobilePage.getByText("Riwayat laporan terkirim tersedia saat perangkat terhubung.")).toBeVisible();
    await expect(mobilePage.getByText("Memuat laporan…")).toBeHidden();

    await db().session.updateMany({ where: { userId: owner.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    await mobile.setOffline(false);
    await expect(mobilePage).toHaveURL((url) => url.pathname === "/masuk" && url.searchParams.get("next") === "/radar?view=reports");
    expect(await db().report.count({ where: { ownerId: owner.id } })).toBe(0);

    async function loginInBrowser(recipient: string) {
      await mobilePage.goto("/masuk");
      await mobilePage.getByLabel("Nomor WhatsApp atau email").fill(recipient);
      await mobilePage.getByLabel("Kata sandi").fill(password);
      const signIn = async () => {
        const response = mobilePage.waitForResponse((item) => new URL(item.url()).pathname === "/api/auth/sign-in/phone-number");
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
      await mobilePage.getByRole("button", { name: "Laporan", exact: true }).click({ timeout: 15_000 });
    }

    await loginInBrowser(phones[1]);
    await expect(mobilePage.getByText("Antrean kosong.")).toBeVisible();
    await expect(mobilePage.getByText("Menunggu sinkronisasi")).toBeHidden();
    await loginInBrowser(phones[0]);
    await expect(mobilePage.getByText("Antrean kosong.")).toBeVisible({ timeout: 25_000 });
    await expect(officerPage.getByRole("button", { name: `Belum diketahui · ${point.name}` })).toBeVisible({ timeout: 12_000 });
    const pending = await (await mobile.request.get("/api/reports")).json() as { reports: { id: string }[] };
    expect(pending.reports).toHaveLength(1);
    const first = pending.reports[0].id;
    expect((await mobile.request.get(`/api/reports/${first}/photo`)).status()).toBe(200);
    expect((await other.request.get(`/api/reports/${first}/photo`)).status()).toBe(404);
    expect((await other.request.patch(`/api/reports/${first}/review`, { headers: origin, data: verified })).status()).toBe(403);

    await officerPage.getByRole("button", { name: `Belum diketahui · ${point.name}` }).click();
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
          report: JSON.stringify({ id, longitude, latitude: point.latitude, observedAt: observedAt.toISOString(), finding: "blast", notes: "" }),
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
      return (await response.json() as { id: string }).id;
    }

    const id = randomUUID();
    const time = new Date(Date.now() - 3000);
    const repeated = await Promise.all([submit(id, point.longitude + .0005, time), submit(id, point.longitude + .0005, time)]);
    expect(repeated.map((response) => response.status()).sort()).toEqual([200, 201]);
    const second = (await repeated[0].json() as { id: string }).id;
    expect((await repeated[1].json() as { id: string }).id).toBe(second);
    const decisions = await Promise.all([approve(second), approve(second)]);
    expect(decisions.map((response) => response.status()).sort()).toEqual([200, 409]);

    const old = await addReport(point.longitude, new Date(Date.now() - 8 * 86_400_000));
    expect((await approve(old)).status()).toBe(200);
    const far = await addReport(point.longitude + .008);
    expect((await approve(far)).status()).toBe(200);
    const before = await (await mobile.request.get("/api/radar")).json() as { summaries: { id: string; clustered: boolean }[] };
    expect(before.summaries.find((row) => row.id === point.id)?.clustered).toBe(false);
    const third = await addReport(point.longitude + .001);
    const start = performance.now();
    const reviewed = await approve(third);
    const milliseconds = Math.round(performance.now() - start);
    expect(reviewed.status(), await reviewed.text()).toBe(200);
    console.log(`Aktivasi klaster tiga laporan, respons API: ${milliseconds} ms`);
    await expect.poll(async () => (await (await mobile.request.get("/api/alerts")).json() as unknown[]).length).toBe(1);
    expect(await (await other.request.get("/api/alerts")).json()).toEqual([]);

    const radar = await (await mobile.request.get("/api/radar")).json() as RadarSnapshot;
    expect(radar.summaries.find((row) => row.id === point.id)).toMatchObject({ clustered: true, count: 4 });
    expect(JSON.stringify(radar)).not.toMatch(/latitude|longitude|ownerId/);
    expect(radar.trend).toHaveLength(4);
    expect(radar.trend?.reduce((total, week) => total + week.count, 0)).toBe(5);
    const another = await addReport(point.longitude + .0002);
    expect((await approve(another)).status()).toBe(200);
    expect(await (await mobile.request.get("/api/alerts")).json()).toHaveLength(1);

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
    await mobilePage.getByRole("button", { name: "Peringatan", exact: true }).click();
    await expect(mobilePage.getByText("Siaran PPL")).toHaveCount(1);
    await expect(mobilePage.getByText("Siaran PPL")).toBeVisible();
    await expect(mobilePage.getByText("Klaster terverifikasi")).toBeVisible();
    await mobilePage.evaluate(() => {
      Object.defineProperty(Notification, "requestPermission", { configurable: true, value: async () => "denied" });
    });
    await mobilePage.getByRole("button", { name: "Aktifkan notifikasi" }).click();
    await expect(mobilePage.getByText("Izin notifikasi belum diberikan.", { exact: false })).toBeVisible();

    const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
    await mobilePage.evaluate(async (endpoint) => {
      await navigator.serviceWorker.ready;
      let active = false;
      const subscription = {
        endpoint,
        toJSON: () => ({ endpoint, keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) } }),
        unsubscribe: async () => { active = false; return true; },
      };
      Object.defineProperty(Notification, "requestPermission", { configurable: true, value: async () => "granted" });
      Object.defineProperty(PushManager.prototype, "getSubscription", { configurable: true, value: async () => active ? subscription : null });
      Object.defineProperty(PushManager.prototype, "subscribe", { configurable: true, value: async () => { active = true; return subscription; } });
    }, endpoint);
    await mobilePage.getByRole("button", { name: "Aktifkan notifikasi" }).click();
    await expect(mobilePage.getByText("Notifikasi perangkat diaktifkan.")).toBeVisible();
    const ownsPush = { headers: origin, data: { endpoint } };
    expect(await (await mobile.request.post("/api/push/status", ownsPush)).json()).toEqual({ subscribed: true });
    expect(await (await other.request.post("/api/push/status", ownsPush)).json()).toEqual({ subscribed: false });
    const pushInput = { id: randomUUID(), districtId: point.id, title: "Uji antrean notifikasi", body: "Isi peringatan hanya di kotak masuk." };
    const sendPushBroadcast = () => staff.request.post("/api/ppl/broadcasts", { headers: origin, data: pushInput });
    const pushBroadcasts = await Promise.all([sendPushBroadcast(), sendPushBroadcast()]);
    expect(pushBroadcasts.map((result) => result.status()).sort()).toEqual([200, 201]);
    expect((await staff.request.post("/api/ppl/broadcasts", { headers: origin, data: { ...pushInput, title: "Judul lain" } })).status()).toBe(409);
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
    await mobilePage.getByRole("button", { name: "Matikan notifikasi" }).click();
    await expect(mobilePage.getByText("Notifikasi perangkat dinonaktifkan.")).toBeVisible();
    expect(await (await mobile.request.post("/api/push/status", ownsPush)).json()).toEqual({ subscribed: false });

    const follow = await staff.request.put("/api/ppl/follow-ups", {
      headers: origin, data: { districtId: point.id, kind: "outreach", status: "planned", note: "Kunjungan uji" },
    });
    expect(follow.status()).toBe(200);
    await expect(officerPage.getByText("Kunjungan uji")).toBeVisible({ timeout: 12_000 });
    const followUp = { id: randomUUID(), districtId: point.id, kind: "outreach", status: "complete", note: "Kunjungan selesai" };
    for (let repeat = 0; repeat < 2; repeat++) {
      expect((await staff.request.put("/api/ppl/follow-ups", { headers: origin, data: followUp })).status()).toBe(200);
    }
    const followPath = "/api/ppl/follow-ups/history";
    expect((await mobile.request.get(followPath)).status()).toBe(403);
    const followHistory = await (await staff.request.get(followPath)).json() as Page<FollowUpEntry>;
    expect(followHistory.entries.map((entry) => entry.note)).toEqual(["Kunjungan selesai", "Kunjungan uji"]);
    await officerPage.getByText("Riwayat tindak lanjut", { exact: true }).click();
    await expect(officerPage.locator("details").filter({ hasText: "Riwayat tindak lanjut" }).getByText("Kunjungan uji")).toBeVisible();

    await officerPage.getByLabel("Status laporan").selectOption("verified");
    await officerPage.getByRole("button", { name: `Blas daun · ${point.name}` }).first().click();
    await officerPage.getByRole("button", { name: "Koreksi keputusan" }).click();
    await officerPage.getByLabel("Keparahan").selectOption("severe");
    await officerPage.getByLabel("Alasan koreksi keputusan").fill("Kondisi rumpun diperiksa kembali");
    await officerPage.getByRole("button", { name: "Simpan koreksi keputusan" }).click();
    const reviews = `/api/reports/${another}/reviews`;
    await expect.poll(async () => (await (await staff.request.get(reviews)).json() as Page<ReviewEntry>).entries.length).toBe(2);
    const reviewHistory = await (await staff.request.get(reviews)).json() as Page<ReviewEntry>;
    expect(reviewHistory.entries).toMatchObject([{ severity: "severe", reason: "Kondisi rumpun diperiksa kembali" }, { severity: "mild" }]);
    expect((await mobile.request.get(reviews)).status()).toBe(403);
    const corrected = { status: "rejected", revision: 1, note: "Laporan perlu dibuat ulang", reason: "Sumber laporan diperiksa kembali" };
    expect((await staff.request.patch(reviews, { headers: origin, data: corrected })).status()).toBe(409);
    for (const id of [third, second]) {
      expect((await staff.request.patch(`/api/reports/${id}/reviews`, { headers: origin, data: corrected })).status()).toBe(200);
    }
    const recomputed = await (await mobile.request.get("/api/radar")).json() as RadarSnapshot;
    expect(recomputed.summaries.find((row) => row.id === point.id)).toMatchObject({ clustered: false, count: 3 });
    expect((await (await mobile.request.get("/api/alerts")).json()) as unknown[]).toContainEqual(expect.objectContaining({ title: "Koreksi data radar" }));

    await mobilePage.getByRole("button", { name: "Aktifkan notifikasi" }).click();
    await expect(mobilePage.getByText("Notifikasi perangkat diaktifkan.")).toBeVisible();
    await mobilePage.route("**/api/push", (route) => route.fulfill({ status: 503, json: { message: "Pembersihan notifikasi gagal." } }));
    const signedOut = mobilePage.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/sign-out");
    await mobilePage.getByRole("button", { name: "Keluar", exact: true }).click();
    expect((await signedOut).ok()).toBe(true);
    await expect(mobilePage.getByText("Petani uji", { exact: true })).toBeHidden();
    expect(await (await mobile.request.get("/api/session")).json()).toBeNull();
  } finally {
    await Promise.all([mobile.close(), other.close(), staff.close()]);
  }
});

test("PPL records aid allocations and concurrent deliveries stay within the balance", async ({ browser }) => {
  const farmer = await browser.newContext({ baseURL });
  const staff = await browser.newContext({ ...devices["Pixel 7"], baseURL });
  const page = await staff.newPage();
  const path = "/api/ppl/aid-allocations";
  const districtId = "32-15-03";
  const item = `Sarung tangan ${randomUUID().slice(0, 8)}`;

  try {
    await Promise.all([account(farmer, phone(), "Petani bantuan"), account(staff, phone(), "PPL bantuan", true)]);
    await page.goto("/ppl");
    const aid = page.getByRole("region", { name: "Alokasi bantuan" });
    await expect(aid.getByLabel("Nama barang")).toHaveAttribute("placeholder", "Contoh: Perangkap kuning");
    await expect(aid.getByLabel("Nama barang")).toHaveAttribute("required", "");
    await expect(aid.getByLabel("Catatan (opsional)")).toBeVisible();
    await aid.getByLabel("Kecamatan penerima").selectOption(districtId);
    await aid.getByLabel("Nama barang").fill(item);
    await aid.getByLabel("Jumlah alokasi").fill("12");
    await aid.getByLabel("Satuan").fill("pasang");
    const radarBefore = await (await staff.request.get("/api/radar")).json() as RadarSnapshot;
    await aid.getByRole("button", { name: "Simpan alokasi" }).click();
    await expect(aid.getByText("Alokasi bantuan tersimpan.")).toBeVisible();
    await expect(aid.getByText("Sisa 12 pasang")).toBeVisible();
    expect(await (await staff.request.get("/api/radar")).json()).toEqual(radarBefore);

    const list = await staff.request.get(path);
    expect(list.ok()).toBeTruthy();
    const allocations = await list.json() as AidAllocations;
    const allocation = allocations.allocations.find((row) => row.item === item)!;
    expect(allocation).toMatchObject({ districtId, quantity: 12, deliveredQuantity: 0 });
    const deliveryPath = `${path}/${allocation.id}`;
    expect((await farmer.request.get(path)).status()).toBe(403);
    expect((await farmer.request.get(deliveryPath)).status()).toBe(403);
    expect((await farmer.request.post(path, { headers: origin, data: allocation })).status()).toBe(403);
    expect((await farmer.request.post(deliveryPath, { headers: origin, data: {} })).status()).toBe(403);
    expect((await staff.request.post(path, { headers: origin, data: allocation })).status()).toBe(200);
    expect((await staff.request.post(path, { headers: origin, data: { ...allocation, quantity: 15 } })).status()).toBe(409);

    await aid.getByRole("button", { name: `Lihat penyaluran ${item}` }).click();
    await expect(aid.getByText("Belum ada penyaluran.")).toBeVisible();
    await aid.getByLabel("Kelompok penerima").fill("Kelompok Tani Sari");
    await aid.getByLabel("Jumlah penyaluran").fill("4");
    await aid.getByRole("button", { name: "Simpan penyaluran" }).click();
    await expect(aid.getByText("Penyaluran tersimpan.")).toBeVisible();
    await expect(aid.getByText("Kelompok Tani Sari")).toBeVisible();
    await expect(aid.getByText("Penyaluran sebagian")).toBeVisible();
    await expect(aid.getByText("Sisa 8 pasang")).toBeVisible();

    const deliveries = ["Sejahtera", "Sumber Padi"].map((name) => ({ id: randomUUID(), recipient: `Kelompok Tani ${name}`, quantity: 8 }));
    const results = await Promise.all(deliveries.map((data) => staff.request.post(deliveryPath, { headers: origin, data })));
    expect(results.map((result) => result.status()).sort()).toEqual([201, 409]);
    const saved = deliveries[results.findIndex((result) => result.status() === 201)];
    expect((await staff.request.post(deliveryPath, { headers: origin, data: saved })).status()).toBe(200);
    expect((await staff.request.post(deliveryPath, { headers: origin, data: { ...saved, quantity: 1 } })).status()).toBe(409);
    const history = await (await staff.request.get(deliveryPath)).json() as AidHistory;
    expect(history.deliveries.map(({ quantity }) => quantity)).toEqual([8, 4]);
    await expect(aid.getByText("Seluruh alokasi sudah disalurkan.")).toBeVisible({ timeout: 12_000 });
    await expect(aid.getByRole("button", { name: "Simpan penyaluran" })).toBeHidden();

    const allocationEdit = { ...allocation, target: "allocation", reason: "Stok dicocokkan kembali", quantity: 16 };
    expect((await farmer.request.patch(deliveryPath, { headers: origin, data: allocationEdit })).status()).toBe(403);
    expect((await staff.request.patch(deliveryPath, { headers: origin, data: { ...allocationEdit, quantity: 11 } })).status()).toBe(409);
    const detail = aid.getByRole("region", { name: `Penyaluran ${item}` });
    await detail.getByRole("button", { name: "Koreksi alokasi", exact: true }).click();
    await detail.getByLabel("Jumlah alokasi").fill("16");
    await detail.getByLabel("Alasan koreksi bantuan").fill(allocationEdit.reason);
    await detail.getByRole("button", { name: "Simpan koreksi bantuan" }).click();
    await expect(aid.getByText("Sisa 4 pasang")).toBeVisible();
    expect((await staff.request.post(path, { headers: origin, data: allocation })).status()).toBe(200);
    expect((await staff.request.patch(deliveryPath, { headers: origin, data: allocationEdit })).status()).toBe(409);
    await detail.getByRole("button", { name: `Koreksi penyaluran ${saved.recipient}` }).click();
    await detail.getByLabel("Jumlah penyaluran").fill("6");
    await detail.getByLabel("Alasan koreksi bantuan").fill("Jumlah serah terima disesuaikan");
    await detail.getByRole("button", { name: "Simpan koreksi bantuan" }).click();
    await expect(aid.getByText("Sisa 6 pasang")).toBeVisible();
    expect((await staff.request.post(deliveryPath, { headers: origin, data: saved })).status()).toBe(200);
    await detail.getByRole("button", { name: `Batalkan penyaluran ${saved.recipient}` }).click();
    await detail.getByLabel("Alasan pembatalan").fill("Bukti penyaluran dibatalkan");
    await detail.getByRole("button", { name: "Konfirmasi pembatalan penyaluran" }).click();
    await expect(aid.getByText("Sisa 12 pasang")).toBeVisible();
    await expect(detail.getByText("Dibatalkan", { exact: true })).toBeVisible();
    await detail.getByText("Riwayat koreksi bantuan", { exact: true }).click();
    await expect(detail.getByText(/Bukti penyaluran dibatalkan/)).toBeVisible();
    const auditPath = `${deliveryPath}?history=corrections`;
    expect((await farmer.request.get(auditPath)).status()).toBe(403);
    const changes = await (await staff.request.get(auditPath)).json() as Page<AidCorrection>;
    expect(changes.entries).toMatchObject([
      { kind: "void-delivery", current: { voided: true } },
      { kind: "delivery", previous: { quantity: 8 }, current: { quantity: 6 } },
      { kind: "allocation", previous: { quantity: 12 }, current: { quantity: 16 } },
    ]);
  } finally {
    await Promise.all([farmer.close(), staff.close()]);
  }
});


test("a verified email account can link WhatsApp and recover its password", async ({ request }) => {
  const id = randomUUID();
  const email = `legacy-${id}@example.test`;
  const phoneNumber = phone();
  const newPassword = "new-website-password";
  await db().user.create({ data: {
    id, email, emailVerified: true, name: "Petani lama",
    accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
  } });
  function post(path: string, data: object) {
    return request.post(`/api/auth/${path}`, { headers: origin, data });
  }
  expect((await post("sign-in/email", { email, password })).ok()).toBeTruthy();
  expect((await post("phone-number/send-otp", { phoneNumber })).ok()).toBeTruthy();
  const code = await receivedCode(phoneNumber);
  expect((await post("whatsapp/link", { phoneNumber, code, password: "incorrect" })).status()).toBe(400);
  expect((await post("whatsapp/link", { phoneNumber, code, password })).ok()).toBeTruthy();
  expect(await (await request.get("/api/session")).json()).toMatchObject({ id, whatsappLinked: true });

  expect((await post("phone-number/request-password-reset", { phoneNumber })).ok()).toBeTruthy();
  const otp = await receivedCode(phoneNumber, "atur ulang kata sandi");
  const wrongOtp = otp === "000000" ? "111111" : "000000";
  expect((await post("phone-number/reset-password", { phoneNumber, otp: wrongOtp, newPassword })).status()).toBe(400);
  expect((await post("phone-number/reset-password", { phoneNumber, otp, newPassword })).ok()).toBeTruthy();
  expect(await (await request.get("/api/session")).json()).toBeNull();
  expect((await post("sign-in/phone-number", { phoneNumber, password: newPassword })).ok()).toBeTruthy();
});

test("the landing, legacy alert link and radar map keep working during a style load", async ({ browser }) => {
  const context = await browser.newContext({ baseURL, serviceWorkers: "block" });
  const page = await context.newPage();
  const styleErrors: string[] = [];
  page.on("pageerror", (error) => styleErrors.push(error.message));
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pantau temuan padi dari lahan" })).toBeVisible();
    await page.goto("/radar");
    await expect(page).toHaveURL((url) => url.pathname === "/masuk" && url.searchParams.get("next") === "/radar");
    expect((await context.request.get("/api/radar")).status()).toBe(401);

    await page.goto("/?view=alerts");
    await expect(page).toHaveURL((url) => url.pathname === "/masuk" && url.searchParams.get("next") === "/radar?view=alerts");
    await expect(page.getByRole("heading", { name: "Masuk", exact: true })).toBeVisible();
    await account(context, phone(), "Petani radar");

    await page.route("**/maps/karawang-districts.geojson", async (route) => {
      await delay(1200);
      await route.continue();
    });
    await page.route("**/api/weather", (route) => route.fulfill({ json: {
      observedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), fetchedAt: new Date().toISOString(),
      windSpeed: 10, windDirection: 25, humidity: 72,
    } }));
    await page.goto("/radar");
    const filter = page.getByLabel("Filter temuan radar");
    await expect(filter).toHaveValue("");
    await filter.selectOption("blast");
    await filter.selectOption("");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect(page.getByText("Memuat peta Karawang…")).toBeHidden();
    await expect(page.getByText("Data cuaca kedaluwarsa")).toBeVisible();
    await expect(page.getByRole("region", { name: "Tren temuan terverifikasi" }).getByRole("listitem")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: "Panduan pemeriksaan di lahan" })).toBeVisible();
    expect(styleErrors).toEqual([]);
  } finally {
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
  }
});
