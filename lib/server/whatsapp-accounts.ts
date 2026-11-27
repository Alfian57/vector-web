import { createHmac, randomUUID } from "node:crypto";
import { APIError, createAuthEndpoint, createAuthMiddleware, sensitiveSessionMiddleware } from "better-auth/api";
import { z } from "zod";
import { passwordMinimum, whatsappNumberPattern, whatsappOtpLength } from "@/lib/whatsapp";
import { db } from "./db";

const verification = z.object({
  phoneNumber: z.string().regex(whatsappNumberPattern),
  code: z.string().length(whatsappOtpLength).regex(/^\d+$/),
});
const sendPaths = new Set(["/phone-number/send-otp", "/phone-number/request-password-reset"]);
const cooldown = 60_000;

async function limitDelivery(path: string, phone: string, secret: string) {
  const key = `whatsapp:${createHmac("sha256", secret).update(`${path}:${phone}`).digest("hex")}`;
  const now = Date.now();
  const [claimed] = await db().$queryRaw<{ id: string }[]>`
    INSERT INTO "rateLimit" (id, key, count, "lastRequest")
    VALUES (${randomUUID()}, ${key}, 1, ${now}::bigint)
    ON CONFLICT (key) DO UPDATE SET "lastRequest" = EXCLUDED."lastRequest"
    WHERE "rateLimit"."lastRequest" <= ${now - cooldown}::bigint
    RETURNING id
  `;
  if (!claimed) throw APIError.fromStatus("TOO_MANY_REQUESTS", { message: "Tunggu 60 detik sebelum meminta kode lagi." });
}

function phoneInUse() {
  return APIError.fromStatus("CONFLICT", { message: "Nomor WhatsApp sudah terhubung ke akun. Masuk dengan nomor tersebut." });
}

function translateUniqueConflict(error: unknown): never {
  if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw phoneInUse();
  throw error;
}

export function whatsappAccounts(consumeCode: (phoneNumber: string, code: string) => Promise<void>) {
  return {
    id: "vektor-whatsapp-accounts",
    hooks: {
      before: [{
        matcher: (ctx: { path?: string }) => ctx.path === "/update-user" || Boolean(ctx.path && sendPaths.has(ctx.path)) ||
          ctx.path === "/phone-number/reset-password",
        handler: createAuthMiddleware(async (ctx) => {
          if (ctx.path === "/update-user") {
            if (ctx.body && Object.hasOwn(ctx.body, "phoneNumber")) {
              throw APIError.fromStatus("BAD_REQUEST", { message: "Gunakan fitur Hubungkan WhatsApp." });
            }
            return;
          }
          const phone = ctx.body?.phoneNumber;
          if (typeof phone !== "string" || !whatsappNumberPattern.test(phone)) {
            throw APIError.fromStatus("BAD_REQUEST", { message: "Nomor WhatsApp tidak valid." });
          }
          if (ctx.path && sendPaths.has(ctx.path)) await limitDelivery(ctx.path, phone, ctx.context.secret);
        }),
      }],
    },
    endpoints: {
      registerWhatsApp: createAuthEndpoint("/whatsapp/register", {
        method: "POST",
        body: verification.extend({
          name: z.string().trim().min(1).max(100),
          password: z.string().min(passwordMinimum).max(128),
        }),
      }, async (ctx) => {
        const { name, phoneNumber, code, password } = ctx.body;
        await consumeCode(phoneNumber, code);
        const id = randomUUID();
        const passwordHash = await ctx.context.password.hash(password);
        try {
          await db().user.create({ data: {
            id, name, email: `${id}@whatsapp.invalid`, phoneNumber, phoneNumberVerified: true,
            accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: passwordHash } },
          } });
        } catch (error) { translateUniqueConflict(error); }
        return ctx.json({ status: true });
      }),
      linkWhatsApp: createAuthEndpoint("/whatsapp/link", {
        method: "POST",
        use: [sensitiveSessionMiddleware],
        body: verification.extend({ password: z.string().min(1).max(128) }),
      }, async (ctx) => {
        const { user } = ctx.context.session;
        if (!user.emailVerified) throw APIError.fromStatus("FORBIDDEN", { message: "Masuk dengan akun yang sudah terverifikasi." });
        const { phoneNumber, code, password } = ctx.body;
        const credential = await ctx.context.internalAdapter.findCredentialAccount(user.id);
        if (!credential?.password || !await ctx.context.password.verify({ hash: credential.password, password })) {
          throw APIError.fromStatus("BAD_REQUEST", { message: "Kata sandi saat ini salah." });
        }
        await consumeCode(phoneNumber, code);
        try {
          const { count } = await db().user.updateMany({
            where: { id: user.id, phoneNumber: null },
            data: { phoneNumber, phoneNumberVerified: true, updatedAt: new Date() },
          });
          if (!count) throw APIError.fromStatus("CONFLICT", { message: "Akun ini sudah terhubung dengan nomor WhatsApp." });
        } catch (error) { translateUniqueConflict(error); }
        return ctx.json({ status: true });
      }),
    },
  };
}
