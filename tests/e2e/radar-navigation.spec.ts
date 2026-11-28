import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { setTimeout as delay } from "node:timers/promises";
import { devices, expect, test, type BrowserContext } from "@playwright/test";
import { db } from "../../lib/server/db";
import { baseURL, origin, password } from "./helpers/pilot-fixtures";

const created = new Set<string>();

async function signIn(context: BrowserContext, name: string) {
  const id = randomUUID();
  const email = `${id}@dashboard-test.invalid`;
  await db().user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      role: "farmer",
      accounts: {
        create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) },
      },
    },
  });
  created.add(id);
  const response = await context.request.post("/api/auth/sign-in/email", {
    headers: origin,
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.afterAll(async () => {
  if (created.size) await db().user.deleteMany({ where: { id: { in: [...created] } } });
  await db().$disconnect();
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
    await expect(page).toHaveURL(
      (url) => url.pathname === "/masuk" && url.searchParams.get("next") === "/radar",
    );
    await expect(page.getByRole("heading", { name: "Masuk", exact: true })).toBeVisible();
    await signIn(context, "Petani radar");

    await page.route("**/maps/karawang-districts.geojson", async (route) => {
      await delay(1200);
      await route.continue();
    });
    await page.route("**/api/weather", (route) =>
      route.fulfill({
        json: {
          observedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          fetchedAt: new Date().toISOString(),
          windSpeed: 10,
          windDirection: 25,
          humidity: 72,
        },
      }),
    );
    await page.goto("/radar");
    const searchTrigger = page.getByRole("button", { name: "Cari menu dan fitur" });
    await searchTrigger.focus();
    await page.keyboard.press("Control+k");
    const searchDialog = page.getByRole("dialog", { name: "Pencarian menu dashboard" });
    await expect(searchDialog).toBeVisible();
    const searchInput = searchDialog.getByRole("searchbox", { name: "Cari menu atau data yang dapat diakses" });
    await expect(searchInput).toBeFocused();
    await searchInput.fill("Petak");
    await expect(searchDialog.getByRole("link", { name: /Petak pantauan/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(searchDialog).toBeHidden();
    await expect(searchTrigger).toBeFocused();
    const filter = page.getByLabel("Filter temuan radar");
    await expect(filter).toHaveValue("");
    await filter.selectOption("blast");
    await expect(page.getByText("Tidak ada temuan untuk filter ini")).toBeVisible();
    await page.getByRole("button", { name: "Hapus filter" }).click();
    await expect(filter).toHaveValue("");
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Perbesar peta" })).toBeVisible();
    await expect.poll(async () => (await page.locator(".map-canvas").boundingBox())?.height ?? 0).toBeGreaterThan(300);
    await expect(page.getByText("Memuat peta Karawang…")).toBeHidden();
    await expect(page.getByText("Data cuaca kedaluwarsa")).toBeVisible();
    await expect(page.getByRole("region", { name: "Tren temuan" }).getByRole("listitem")).toHaveCount(4);
    const search = page.getByLabel("Cari menu dan fitur");
    const accountMenu = page.getByRole("button", { name: "Akun Petani radar, Petani" });
    const [searchBox, accountBox] = await Promise.all([search.boundingBox(), accountMenu.boundingBox()]);
    expect(searchBox?.x ?? Infinity).toBeLessThan(accountBox?.x ?? 0);

    const nav = page.getByRole("navigation", { name: "Navigasi utama" });
    await nav.getByRole("link", { name: "Laporan", exact: true }).click();
    await expect(page).toHaveURL(/\/radar\/reports$/);
    await expect(nav.getByRole("link", { name: "Laporan", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Buat laporan" }).click();
    const reportDialog = page.getByRole("dialog", { name: "Buat laporan" });
    await expect(reportDialog).toBeVisible();
    await expect(page).toHaveURL(/\/radar\/reports$/);
    await reportDialog.getByRole("button", { name: "Tutup dialog" }).click();
    await expect(reportDialog).toBeHidden();
    await expect(nav.getByRole("link", { name: "Laporan", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);

    await page.goto("/radar?view=plots");
    await expect(page).toHaveURL(/\/radar\/plots$/);
    await page.getByRole("button", { name: "Tambah petak" }).click();
    const plotDialog = page.getByRole("dialog", { name: "Tambah petak" });
    await expect(plotDialog).toBeVisible();
    await expect(page.getByLabel("Nama petak")).toBeVisible();
    await expect(nav.getByRole("link", { name: "Petak", exact: true })).toHaveAttribute("aria-current", "page");
    expect(styleErrors).toEqual([]);
  } finally {
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
  }
});

test("the mobile dashboard reserves its bottom navigation and gives a retry after a slow data failure", async ({
  browser,
}) => {
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, serviceWorkers: "block" });
  const page = await context.newPage();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await signIn(context, "Petani ponsel");
    let plotsAvailable = false;
    await page.route("**/api/plots", async (route) => {
      if (!plotsAvailable) {
        await gate;
        await route.fulfill({ status: 503, json: { message: "Layanan petak sementara tidak tersedia." } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.goto("/radar/plots");
    await expect(page.getByRole("status").filter({ hasText: "Memuat petak…" })).toBeAttached();
    const nav = page.getByRole("navigation", { name: "Navigasi utama" });
    await expect(nav.getByRole("link", { name: "Petak" })).toHaveAttribute("aria-current", "page");
    expect((await nav.boundingBox())?.y).toBeGreaterThan((page.viewportSize()?.height ?? 0) - 90);
    release();
    await expect(page.getByRole("alert").filter({ hasText: "Daftar petak belum dapat dimuat" })).toBeVisible();
    plotsAvailable = true;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByText("Belum ada petak pantauan")).toBeVisible();

    const observedAt = new Date().toISOString();
    await page.route("**/api/reports?page=0", (route) =>
      route.fulfill({
        json: {
          hasMore: false,
          reports: [
            {
              id: "1a57c2b1-1e0e-4b92-bb0c-ddc720dfe084",
              observedAt,
              longitude: 107.2,
              latitude: -6.3,
              districtId: "32-15-03",
              districtName: "Telukjambe Timur",
              notes: "",
              status: "verified",
              severity: "mild",
              reviewNote: null,
              reviewRevision: 1,
              finding: "blast",
            },
          ],
        },
      }),
    );
    await nav.getByRole("link", { name: "Laporan", exact: true }).click();
    const table = page.getByRole("table", { name: "Laporan terkirim" });
    await expect(table).toBeVisible();
    expect(
      await table.evaluate((element) => {
        const scroller = element.parentElement;
        return Boolean(
          scroller &&
          scroller.scrollWidth > scroller.clientWidth &&
          document.documentElement.scrollWidth <= window.innerWidth,
        );
      }),
    ).toBe(true);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
  }
});
