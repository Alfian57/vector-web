import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { db } from "../../lib/server/db";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const origin = new URL(baseURL).origin;
const password = "test-password-2026";
const createdIds: string[] = [];

const dashboardRoles = [
  { role: "farmer", name: "Petani Menu Uji", label: "Petani", path: "/radar" },
  { role: "officer", name: "Petugas Menu Uji", label: "Petugas PPL", path: "/ppl" },
  { role: "admin", name: "Admin Menu Uji", label: "Admin", path: "/admin" },
] as const;

async function createAccount(role: (typeof dashboardRoles)[number]["role"], name: string) {
  const id = randomUUID();
  const email = `${id}@profile-test.invalid`;
  await db().user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      role,
      accounts: {
        create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) },
      },
    },
  });
  createdIds.push(id);
  return { id, name, email };
}

test.afterAll(async () => {
  if (createdIds.length) await db().user.deleteMany({ where: { id: { in: createdIds } } });
  await db().$disconnect();
});

test("all dashboard roles can manage their profile and confirm logout", async ({ browser }) => {
  test.setTimeout(180_000);
  const avatar = await sharp({ create: { width: 80, height: 60, channels: 3, background: { r: 38, g: 92, b: 48 } } })
    .png()
    .toBuffer();

  for (const entry of dashboardRoles) {
    const user = await createAccount(entry.role, entry.name);
    const context = await browser.newContext({ baseURL });
    try {
      const signIn = await context.request.post("/api/auth/sign-in/email", {
        headers: { origin },
        data: { email: user.email, password },
      });
      expect(signIn.ok(), await signIn.text()).toBeTruthy();
      const page = await context.newPage();
      await page.goto(entry.path);

      const triggerName = `Akun ${entry.name}, ${entry.label}`;
      await page.getByRole("button", { name: triggerName }).click();
      const accountPanel = page.getByRole("region", { name: "Menu akun" });
      await expect(accountPanel.getByText(user.email)).toBeVisible();
      await expect(accountPanel.getByText("WhatsApp belum terhubung")).toBeVisible();
      await accountPanel.getByRole("link", { name: "Profil" }).click();

      await expect(page).toHaveURL(/\/profil$/);
      await expect(page.getByRole("heading", { name: "Profil akun" })).toBeVisible();
      await page.getByRole("textbox", { name: /Nama/ }).fill(`${entry.name} Baru`);
      await page.getByRole("button", { name: "Simpan nama" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Nama berhasil diperbarui" })).toBeVisible();

      if (entry.role === "farmer") {
        await page.getByLabel("Pilih foto profil (opsional)").setInputFiles({
          name: "avatar.png",
          mimeType: "image/png",
          buffer: avatar,
        });
        const cropDialog = page.getByRole("dialog", { name: "Atur foto profil" });
        await expect(cropDialog).toBeVisible();
        await cropDialog.getByRole("button", { name: "Putar 90 derajat ke kanan" }).click();
        await cropDialog.getByRole("button", { name: "Gunakan foto ini" }).click();
        await expect(page.getByRole("status").filter({ hasText: "Foto profil berhasil diperbarui" })).toBeVisible();
      }

      await page.getByRole("link", { name: "Kembali ke dashboard" }).click();
      await expect(page).toHaveURL(new RegExp(`${entry.path.replace("/", "\\/")}($|\\?)`));
      const updatedTrigger = `Akun ${entry.name} Baru, ${entry.label}`;
      await page.getByRole("button", { name: updatedTrigger }).click();
      const updatedPanel = page.getByRole("region", { name: "Menu akun" });
      await updatedPanel.getByRole("button", { name: "Keluar", exact: true }).click();
      const confirmation = page.getByRole("dialog", { name: "Keluar dari VEKTOR?" });
      await expect(confirmation).toBeVisible();
      await confirmation.getByRole("button", { name: "Batal" }).click();
      await expect(confirmation).toBeHidden();
      expect((await context.request.get("/api/session")).status()).toBe(200);
      expect(await context.request.get("/api/session").then((response) => response.json())).not.toBeNull();

      await page.getByRole("button", { name: updatedTrigger }).click();
      await page
        .getByRole("region", { name: "Menu akun" })
        .getByRole("button", { name: "Keluar", exact: true })
        .click();
      const finalConfirmation = page.getByRole("dialog", { name: "Keluar dari VEKTOR?" });
      if (entry.role === "farmer") {
        await context.setOffline(true);
        await finalConfirmation.getByRole("button", { name: "Ya, keluar" }).click();
        await expect(finalConfirmation.getByRole("alert")).toContainText("sedang offline");
        await context.setOffline(false);
      }
      await finalConfirmation.getByRole("button", { name: "Ya, keluar" }).click();
      await expect(page).toHaveURL(/\/masuk$/);
      expect(await context.request.get("/api/session").then((response) => response.json())).toBeNull();
    } finally {
      await context.close();
    }
  }
});
