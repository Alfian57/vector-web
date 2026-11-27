import { connection } from "next/server";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { reviewCorrectionInput, reviewInput, subscriptionInput, uuid } from "@/lib/domain";
import { listActivityLogs, listAdminAccounts, adminOverview, changeAccountAccess } from "@/lib/server/admin";
import { createAidAllocation, listAidAllocations, listAidDeliveries, recordAidDelivery } from "@/lib/server/aid";
import { correctAid, listAidCorrections } from "@/lib/server/aid-corrections";
import { getAccount } from "@/lib/server/auth";
import {
  archiveEducationArticle, educationImage, getEducationForAdmin, getPublishedArticle, restoreEducationArticle,
  listEducationForAdmin, listPublishedArticles, saveEducationArticle, uploadEducationImage,
} from "@/lib/server/education";
import { writeActivitySafely } from "@/lib/server/activity-log";
import type { Account } from "@/lib/domain";
import { checkOrigin, handle, json, RequestError } from "@/lib/server/http";
import {
  addPlot, broadcast, deletePlot, listAlerts, listFollowUpEntries, listFollowUps, listPlots,
  ownsSubscription, putSubscription, readAlert, removeSubscription, writeFollowUp,
} from "@/lib/server/monitoring";
import { pushConfig } from "@/lib/server/push-config";
import { getWeather, radarSnapshot } from "@/lib/server/radar";
import { createReport, listReportReviews, listReports, reportPhoto, reviewReport } from "@/lib/server/reports";

type Context = RouteContext<"/api/[...resource]">;
const pushEndpoint = subscriptionInput.pick({ endpoint: true });

function pageNumber(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10_000) {
    throw new RequestError(422, "Nomor halaman tidak valid.");
  }
  return page;
}

async function mapPackage() {
  const filename = "karawang.pmtiles";
  const file = await stat(join(process.cwd(), "public", "maps", filename)).catch(() => null);
  if (!file?.size) throw new RequestError(503, "Paket peta Karawang belum disiapkan.");
  const version = `${file.size}-${Math.floor(file.mtimeMs)}`;
  return {
    url: `/maps/${filename}?v=${version}`,
    version,
    bytes: file.size,
    mapTilerKey: process.env.MAPTILER_API_KEY?.trim() || undefined,
  };
}

async function auditRequest<T extends Response>(actor: Account, method: string, endpoint: string, run: () => Promise<T>) {
  if (method === "GET" || (endpoint === "push/status" && method === "POST")) return run();
  const category = endpoint.startsWith("admin/education") || endpoint.startsWith("education/") ? "education"
    : endpoint.startsWith("admin/accounts") ? "account"
      : endpoint.startsWith("admin/") ? "admin" : "api";
  const routeName = endpoint.split("/").slice(0, 2).join(".").replace(/[^a-z0-9_.-]/gi, "").slice(0, 60) || "request";
  try {
    const response = await run();
    await writeActivitySafely({
      category, action: `api.${method.toLowerCase()}.${routeName}`, actor,
      outcome: response.status < 400 ? "success" : "failure",
      summary: `Permintaan ${method} ${routeName} ${response.status < 400 ? "berhasil" : "gagal"} (${response.status}).`,
    });
    return response;
  } catch (error) {
    await writeActivitySafely({
      category, action: `api.${method.toLowerCase()}.${routeName}`, actor, outcome: "failure",
      summary: `Permintaan ${method} ${routeName} gagal.`,
    });
    throw error;
  }
}

async function route(request: Request, context: Context) {
  await connection();
  return handle(async () => {
    const { resource: segments } = await context.params;
    const endpoint = segments.join("/");
    const method = request.method;
    const params = new URL(request.url).searchParams;
    if (method === "GET" && segments.length === 1 && segments[0] === "map-package") return json(await mapPackage());
    if (method === "GET" && segments.length === 1 && segments[0] === "push-key") return json({ key: pushConfig()?.publicKey ?? null });
    if (method === "GET" && endpoint === "education") return json(await listPublishedArticles(params));
    if (method === "GET" && segments[0] === "education" && segments[1] === "images" && segments.length === 3) {
      const account = await getAccount(request.headers).catch(() => null);
      return educationImage(uuid.parse(segments[2]), account);
    }
    if (method === "GET" && segments[0] === "education" && segments.length === 2) {
      return json(await getPublishedArticle(segments[1]));
    }
    const account = await getAccount(request.headers);
    if (endpoint === "session" && method === "GET") return json(account);
    if (!account) throw new RequestError(401, "Masuk untuk melanjutkan.");
    if (method !== "GET") checkOrigin(request);
    if (segments[0] === "admin") {
      if (account.role !== "admin") {
        await writeActivitySafely({ category: "admin", action: "admin.access.denied", actor: account,
          outcome: "failure", targetType: "route", targetId: "admin-api", summary: "Akses API Admin ditolak untuk peran ini." });
        throw new RequestError(403, "Menu ini hanya tersedia untuk Admin.");
      }
      return auditRequest(account, method, endpoint, async () => {
        if (segments.length === 2 && segments[1] === "overview" && method === "GET") return json(await adminOverview());
        if (segments.length === 2 && segments[1] === "accounts" && method === "GET") return json(await listAdminAccounts(params));
        if (segments.length === 3 && segments[1] === "accounts" && method === "PATCH") {
          await changeAccountAccess(account, segments[2], await request.json());
          return json({ ok: true });
        }
        if (segments.length === 2 && segments[1] === "logs" && method === "GET") return json(await listActivityLogs(params));
        if (segments.length === 2 && segments[1] === "education" && method === "GET") return json(await listEducationForAdmin(params));
        if (segments.length === 2 && segments[1] === "education" && method === "POST") {
          return json(await saveEducationArticle(account, undefined, await request.json()), 201);
        }
        if (segments.length === 3 && segments[1] === "education" && method === "GET") {
          return json(await getEducationForAdmin(uuid.parse(segments[2])));
        }
        if (segments.length === 3 && segments[1] === "education" && method === "PATCH") {
          const body: unknown = await request.json();
          if (typeof body === "object" && body !== null && "action" in body && body.action === "restore") {
            await restoreEducationArticle(account, uuid.parse(segments[2]));
            return json({ ok: true });
          }
          if (typeof body === "object" && body !== null && "status" in body && body.status === "archived") {
            await archiveEducationArticle(account, uuid.parse(segments[2]));
            return json({ ok: true });
          }
          return json(await saveEducationArticle(account, uuid.parse(segments[2]), body));
        }
        if (segments.length === 3 && segments[1] === "education" && method === "DELETE") {
          await archiveEducationArticle(account, uuid.parse(segments[2]));
          return json({ ok: true });
        }
        if (segments.length === 4 && segments[1] === "education" && segments[3] === "images" && method === "POST") {
          return json(await uploadEducationImage(account, uuid.parse(segments[2]), request), 201);
        }
        throw new RequestError(404, "Halaman tidak ditemukan.");
      });
    }
    const [resource = "", id, action, ...rest] = segments;
    if (rest.length) throw new RequestError(404, "Halaman tidak ditemukan.");
    return auditRequest(account, method, endpoint, async () => {
    if (method === "GET" && !id) {
      if (resource === "radar") return json(await radarSnapshot());
      if (resource === "weather") return json(await getWeather());
    }
    const requestedOwner = request.headers.get("x-vektor-account");
    if (requestedOwner && requestedOwner !== account.id) {
      throw new RequestError(403, "Masuk kembali dengan akun pemilik laporan.");
    }
    if (resource === "reports" && !id) {
      if (method === "GET") {
        const staff = params.get("scope") === "ppl";
        if (staff && account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat melihat antrean.");
        return json(await listReports(account, params, staff));
      }
      if (method === "POST") {
        if (!requestedOwner) {
          throw new RequestError(403, "Masuk kembali dengan akun pemilik laporan.");
        }
        const { id: reportId, created } = await createReport(request, account);
        return json({ id: reportId }, created ? 201 : 200);
      }
    }
    if (resource === "reports" && id && action === "photo" && method === "GET") {
      return reportPhoto(account, uuid.parse(id));
    }
    if (resource === "reports" && id && action === "review" && method === "PATCH") {
      if (account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat memverifikasi.");
      await reviewReport(uuid.parse(id), account, reviewInput.parse(await request.json()));
      return json({ ok: true });
    }
    if (resource === "reports" && id && action === "reviews") {
      if (account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat melihat atau mengoreksi keputusan.");
      const reportId = uuid.parse(id);
      if (method === "GET") return json(await listReportReviews(reportId, pageNumber(params)));
      if (method === "PATCH") {
        await reviewReport(reportId, account, reviewCorrectionInput.parse(await request.json()));
        return json({ ok: true });
      }
    }
    if (resource === "plots" && !action) {
      if (!id && method === "GET") return json(await listPlots(account.id));
      if (!id && method === "POST") {
        await addPlot(account.id, await request.json());
        return json({ ok: true }, 201);
      }
      if (id && method === "DELETE") {
        await deletePlot(account.id, uuid.parse(id));
        return json({ ok: true });
      }
    }
    if (resource === "alerts" && !action) {
      if (!id && method === "GET") return json(await listAlerts(account.id));
      if (id && method === "PATCH") {
        await readAlert(account.id, uuid.parse(id));
        return json({ ok: true });
      }
    }
    if (resource === "push" && !id) {
      if (method === "POST") {
        if (!pushConfig()) {
          throw new RequestError(503, "Notifikasi perangkat belum dikonfigurasi.");
        }
        await putSubscription(account.id, await request.json());
        return json({ ok: true });
      }
      if (method === "DELETE") {
        const { endpoint } = pushEndpoint.parse(await request.json());
        await removeSubscription(account.id, endpoint);
        return json({ ok: true });
      }
    }
    if (resource === "push" && id === "status" && !action && method === "POST") {
      const { endpoint } = pushEndpoint.parse(await request.json());
      return json({ subscribed: await ownsSubscription(account.id, endpoint) });
    }
    if (resource === "ppl" && id === "aid-allocations") {
      if (account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat mengakses.");
      if (!action && method === "GET") return json(await listAidAllocations(pageNumber(params)));
      if (!action && method === "POST") {
        const created = await createAidAllocation(account.id, await request.json());
        return json({ ok: true }, created ? 201 : 200);
      }
      if (action && method === "GET") {
        const allocationId = uuid.parse(action);
        const page = pageNumber(params);
        return json(params.get("history") === "corrections"
          ? await listAidCorrections(allocationId, page) : await listAidDeliveries(allocationId, page));
      }
      if (action && method === "POST") {
        const created = await recordAidDelivery(uuid.parse(action), account.id, await request.json());
        return json({ ok: true }, created ? 201 : 200);
      }
      if (action && method === "PATCH") {
        await correctAid(uuid.parse(action), account.id, await request.json());
        return json({ ok: true });
      }
    }
    if (resource === "ppl" && id === "follow-ups" && action === "history" && method === "GET") {
      if (account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat mengakses.");
      return json(await listFollowUpEntries(pageNumber(params)));
    }
    if (resource === "ppl" && !action) {
      if (account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat mengakses.");
      if (id === "broadcasts" && method === "POST") {
        const created = await broadcast(account.id, await request.json());
        return json({ ok: true }, created ? 201 : 200);
      }
      if (id === "follow-ups" && method === "GET") return json(await listFollowUps());
      if (id === "follow-ups" && method === "PUT") {
        await writeFollowUp(account.id, await request.json());
        return json({ ok: true });
      }
    }
    throw new RequestError(404, "Halaman tidak ditemukan.");
    });
  });
}

export const GET = route;
export const POST = route;
export const PATCH = route;
export const PUT = route;
export const DELETE = route;
