import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../../../lib/server/db";
import { clearRateLimits } from "./database-fixtures";
import { getCapturedOtp } from "./fonnte-fixtures";
import { TestSession } from "./test-session";
import { assertSafeTestDatabase } from "./test-environment";

export const testPassword = "test-password-2026";

let phoneCounter = 1;
export function nextTestPhone() {
  const suffix = String(phoneCounter++).padStart(6, "0");
  return `+6280000${suffix}`;
}

export async function createWhatsAppAccount(
  session: TestSession,
  {
    name,
    role = "farmer",
    phone = nextTestPhone(),
    password = testPassword,
  }: {
    name: string;
    role?: "farmer" | "officer" | "admin";
    phone?: string;
    password?: string;
  },
) {
  await clearRateLimits();
  const sent = await session.postJson("/api/auth/phone-number/send-otp", { phoneNumber: phone });
  if (!sent.ok) throw new Error(`send-otp failed (${sent.status}): ${await sent.text()}`);

  const code = await getCapturedOtp(phone, "verifikasi akun");
  const registered = await session.postJson("/api/auth/whatsapp/register", {
    phoneNumber: phone,
    code,
    name,
    password,
  });
  if (!registered.ok) throw new Error(`whatsapp/register failed (${registered.status}): ${await registered.text()}`);

  if (role !== "farmer") {
    await db().user.update({ where: { phoneNumber: phone }, data: { role } });
  }

  const signedIn = await session.postJson("/api/auth/sign-in/phone-number", { phoneNumber: phone, password });
  if (!signedIn.ok) throw new Error(`sign-in failed (${signedIn.status}): ${await signedIn.text()}`);

  const meRes = await session.get("/api/session");
  const me = (await meRes.json()) as {
    id: string;
    name: string;
    role: "farmer" | "officer" | "admin";
    whatsappLinked?: boolean;
  };
  return { ...me, phoneNumber: phone, password };
}

export async function createEmailUserInDb({
  email,
  name,
  role = "farmer",
  emailVerified = true,
  password = testPassword,
}: {
  email: string;
  name: string;
  role?: "farmer" | "officer" | "admin";
  emailVerified?: boolean;
  password?: string;
}) {
  assertSafeTestDatabase();
  const id = randomUUID();
  await db().user.create({
    data: {
      id,
      email,
      emailVerified,
      name,
      role,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
  return { id, email, name, role, password };
}
