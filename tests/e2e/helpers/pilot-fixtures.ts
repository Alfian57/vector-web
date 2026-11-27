import { expect, type BrowserContext } from "@playwright/test";
import { db } from "../../../lib/server/db";

export const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const fonnte = process.env.FONNTE_TEST_URL ?? "http://127.0.0.1:18080/send";
export const password = "test-password-2026";
export const origin = { origin: new URL(baseURL).origin };

export function createPhoneGenerator(firstNumber: number) {
  let nextNumber = firstNumber;
  return () => {
    if (nextNumber > 99) throw new Error("Rentang nomor synthetic E2E telah habis.");
    return `+120255501${String(nextNumber++).padStart(2, "0")}`;
  };
}

export async function receivedCode(recipient: string, purpose = "verifikasi akun") {
  const url = new URL("/messages", fonnte);
  url.searchParams.set("target", recipient.slice(1));
  let code = "";
  await expect
    .poll(
      async () => {
        const response = await fetch(url);
        const { message } = (await response.json()) as { message: string | null };
        code = message?.match(new RegExp(`${purpose}: (\\d{6})`))?.[1] ?? "";
        return Boolean(code);
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  return code;
}

export async function account(context: BrowserContext, recipient: string, name: string, officer = false) {
  const sent = await context.request.post("/api/auth/phone-number/send-otp", {
    headers: origin,
    data: { phoneNumber: recipient },
  });
  expect(sent.ok(), await sent.text()).toBeTruthy();
  const registered = await context.request.post("/api/auth/whatsapp/register", {
    headers: origin,
    data: { phoneNumber: recipient, code: await receivedCode(recipient), password, name, role: "officer" },
  });
  expect(registered.ok(), await registered.text()).toBeTruthy();
  if (officer) await db().user.update({ where: { phoneNumber: recipient }, data: { role: "officer" } });
  const signedIn = await context.request.post("/api/auth/sign-in/phone-number", {
    headers: origin,
    data: { phoneNumber: recipient, password },
  });
  expect(signedIn.ok(), await signedIn.text()).toBeTruthy();
  const session = await context.request.get("/api/session");
  expect(session.ok()).toBeTruthy();
  const data = (await session.json()) as { id: string; role: string };
  expect(data.role).toBe(officer ? "officer" : "farmer");
  return data;
}
