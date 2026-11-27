import { connection } from "next/server";
import { getAccount } from "@/lib/server/auth";
import { writeActivitySafely } from "@/lib/server/activity-log";
import { handleAdminApi } from "@/lib/server/api/admin";
import { handleFieldApi } from "@/lib/server/api/field";
import { handleOfficerApi } from "@/lib/server/api/officer";
import { handleProfileApi } from "@/lib/server/api/profile";
import { handlePublicApi } from "@/lib/server/api/public";
import { auditRequest, type ApiRouteContext } from "@/lib/server/api/shared";
import { checkOrigin, handle, json, RequestError } from "@/lib/server/http";

type Context = RouteContext<"/api/[...resource]">;

async function route(request: Request, context: Context) {
  await connection();
  return handle(async () => {
    const { resource: segments } = await context.params;
    const endpoint = segments.join("/");
    const method = request.method;
    const params = new URL(request.url).searchParams;

    const publicResponse = await handlePublicApi(request, segments, params);
    if (publicResponse) return publicResponse;

    const account = await getAccount(request.headers);
    if (endpoint === "session" && method === "GET") return json(account);
    if (!account) throw new RequestError(401, "Masuk untuk melanjutkan.");
    if (method !== "GET") checkOrigin(request);

    const apiContext: ApiRouteContext = { request, segments, method, endpoint, params, account };
    const profileResponse = await handleProfileApi(apiContext);
    if (profileResponse) return profileResponse;

    if (segments[0] === "admin") {
      if (account.role !== "admin") {
        await writeActivitySafely({
          category: "admin",
          action: "admin.access.denied",
          actor: account,
          outcome: "failure",
          targetType: "route",
          targetId: "admin-api",
          summary: "Akses API Admin ditolak untuk peran ini.",
        });
        throw new RequestError(403, "Menu ini hanya tersedia untuk Admin.");
      }
      return auditRequest(account, method, endpoint, () => handleAdminApi(apiContext));
    }

    if (segments.length > 3) throw new RequestError(404, "Halaman tidak ditemukan.");
    return auditRequest(account, method, endpoint, async () => {
      const fieldResponse = await handleFieldApi(apiContext);
      if (fieldResponse) return fieldResponse;
      const officerResponse = await handleOfficerApi(apiContext);
      if (officerResponse) return officerResponse;
      throw new RequestError(404, "Halaman tidak ditemukan.");
    });
  });
}

export const GET = route;
export const POST = route;
export const PATCH = route;
export const PUT = route;
export const DELETE = route;
