import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { expect, test } from "@playwright/test";
import { db } from "../../lib/server/db";
import { createPhoneGenerator, origin, password, receivedCode } from "./helpers/pilot-fixtures";

const phone = createPhoneGenerator(40);

test.afterAll(async () => {
  await db().$disconnect();
});

test("a verified email account can link WhatsApp and recover its password", async ({ request }) => {
  const id = randomUUID();
  const email = `legacy-${id}@example.test`;
  const phoneNumber = phone();
  const newPassword = "new-website-password";
  await db().user.create({
    data: {
      id,
      email,
      emailVerified: true,
      name: "Petani lama",
      accounts: {
        create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) },
      },
    },
  });
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
