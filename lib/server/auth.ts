import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { admin as adminPlugin, createAccessControl } from "better-auth/plugins";
import { phoneNumber } from "better-auth/plugins/phone-number";
import type { Account, AccountRole } from "@/lib/domain";
import { passwordMinimum, whatsappNumberPattern, whatsappOtpExpiry, whatsappOtpLength } from "@/lib/whatsapp";
import { db } from "./db";
import { sendWhatsAppCode } from "./fonnte";
import { whatsappAccounts } from "./whatsapp-accounts";

const adminAccess = createAccessControl({
  user: ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "set-phone", "get", "update"],
  session: ["list", "revoke", "delete"],
});
const regularRole = adminAccess.newRole({ user: [], session: [] });

async function consumeCode(phoneNumber: string, code: string): Promise<void> {
  try {
    await getAuth().api.consumePhoneNumberOTP({ body: { phoneNumber, code } });
  } catch (error) {
    if (error instanceof APIError && (error.statusCode === 400 || error.statusCode === 403)) {
      throw APIError.fromStatus("BAD_REQUEST", { message: "Kode salah atau kedaluwarsa. Periksa kode atau minta kode baru." });
    }
    throw error;
  }
}

function makeAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db(), { provider: "postgresql", transaction: true }),
    disabledPaths: ["/sign-up/email", "/send-verification-email", "/request-password-reset", "/reset-password", "/phone-number/verify"],
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/phone-number/send-otp": { window: 60, max: 10 },
        "/phone-number/request-password-reset": { window: 60, max: 5 },
        "/whatsapp/register": { window: 60, max: 10 },
        "/whatsapp/link": { window: 60, max: 5 },
      },
    },
    plugins: [
      phoneNumber({
        requireVerification: true,
        phoneNumberValidator: (phone) => whatsappNumberPattern.test(phone),
        expiresIn: whatsappOtpExpiry,
        otpLength: whatsappOtpLength,
        allowedAttempts: 3,
        sendOTP: (data) => sendWhatsAppCode(data, "verification"),
        sendPasswordResetOTP: (data) => sendWhatsAppCode(data, "reset"),
      }),
      whatsappAccounts(consumeCode),
      adminPlugin({
        defaultRole: "farmer",
        adminRoles: ["admin"],
        bannedUserMessage: "Akun ini dinonaktifkan. Hubungi pengelola VEKTOR.",
        ac: adminAccess,
        roles: { admin: regularRole, farmer: regularRole, officer: regularRole },
      }),
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: passwordMinimum,
      revokeSessionsOnPasswordReset: true,
    },
  });
}

let auth: ReturnType<typeof makeAuth> | undefined;

export function getAuth() {
  auth ??= makeAuth();
  return auth;
}

export async function getAccount(headers: Headers): Promise<Account | null> {
  const session = await getAuth().api.getSession({ headers });
  const user = session?.user;
  if (!user || user.banned || (!user.emailVerified && !user.phoneNumberVerified)) return null;
  const role: AccountRole | null = user.role === "admin" || user.role === "officer" || user.role === "farmer"
    ? user.role : null;
  if (!role) return null;

  return {
    id: user.id,
    name: user.name,
    role,
    whatsappLinked: user.phoneNumberVerified === true,
  };
}
