import { connection } from "next/server";
import { getAccount, getAuth } from "@/lib/server/auth";
import { writeActivitySafely } from "@/lib/server/activity-log";
import { logSystemEvent } from "@/lib/server/logger";
import type { AccountRole } from "@/lib/domain";
import { handle, unavailable } from "@/lib/server/http";

async function route(request: Request) {
  await connection();
  return handle(async () => {
    const endpoint = new URL(request.url).pathname.replace(/^\/api\/auth\//, "").replace(/^\/+|\/+$/g, "");
    const audited = request.method !== "GET" && [
      "sign-in/email", "sign-in/phone-number", "sign-out", "whatsapp/register", "whatsapp/link",
      "phone-number/send-otp", "phone-number/request-password-reset", "phone-number/reset-password",
    ].includes(endpoint);
    const before = audited ? await getAccount(request.headers).catch(() => null) : null;
    const response = await getAuth().handler(request);
    if (audited) {
      const body = response.ok ? await response.clone().json().catch(() => null) : null;
      const user = body && typeof body === "object" && "user" in body && body.user && typeof body.user === "object" ? body.user : null;
      const userId = user && "id" in user && typeof user.id === "string" ? user.id : before?.id;
      const roleValue = user && "role" in user && typeof user.role === "string" ? user.role : before?.role;
      const role: AccountRole | undefined = roleValue === "admin" || roleValue === "officer" || roleValue === "farmer" ? roleValue : undefined;
      await writeActivitySafely({
        category: "auth", action: `auth.${endpoint.replaceAll("/", ".")}.${response.ok ? "success" : "failure"}`,
        outcome: response.ok ? "success" : "failure", actor: userId && role ? { id: userId, role } : null,
        targetType: userId ? "user" : null, targetId: userId ?? null,
        summary: `Permintaan autentikasi ${endpoint} ${response.ok ? "berhasil" : "gagal"}.`,
      });
    }
    if (response.status >= 500) {
      await logSystemEvent("auth", "auth_handler_failed");
      return unavailable();
    }
    return response;
  });
}

export const GET = route;
export const POST = route;
