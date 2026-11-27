import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";
import { db } from "../../lib/server/db";
import { account, baseURL, createPhoneGenerator } from "./helpers/pilot-fixtures";

const phone = createPhoneGenerator(60);

test.afterAll(async () => {
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
      (url) => url.pathname === "/masuk" && url.searchParams.get("next") === "/radar?view=alerts",
    );
    await expect(page.getByRole("heading", { name: "Masuk", exact: true })).toBeVisible();
    await account(context, phone(), "Petani radar");

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
    await page.getByLabel("Cari menu dan fitur").click();
    const searchDialog = page.getByRole("dialog", { name: "Pencarian menu dashboard" });
    await expect(searchDialog).toBeVisible();
    await searchDialog.getByRole("searchbox", { name: "Cari menu atau data yang dapat diakses" }).fill("Petak");
    await expect(searchDialog.getByRole("button", { name: /Petak pantauan/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(searchDialog).toBeHidden();
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
