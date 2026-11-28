import { reviewCorrectionInput, reviewInput, subscriptionInput, uuid } from "@/lib/domain";
import { RequestError, json } from "../http";
import {
  addPlot,
  deletePlot,
  listAlerts,
  listPlots,
  ownsSubscription,
  putSubscription,
  readAlert,
  removeSubscription,
} from "../monitoring";
import { pushConfig } from "../push-config";
import { getWeather, radarSnapshot } from "../radar";
import { createReport, listReportReviews, listReports, reportPhoto, reviewReport } from "../reports";
import { searchDashboardData } from "../dashboard-search";
import { pageNumber, type ApiRouteContext } from "./shared";

const pushEndpoint = subscriptionInput.pick({ endpoint: true });

function requireFarmer(account: ApiRouteContext["account"]) {
  if (account.role !== "farmer") throw new RequestError(403, "Fitur ini hanya tersedia untuk akun Petani.");
}

export async function handleFieldApi({
  request,
  segments,
  method,
  params,
  account,
}: ApiRouteContext): Promise<Response | null> {
  const [resource = "", id, action] = segments;
  if (resource === "search" && !id && method === "GET")
    return json(await searchDashboardData(account, params.get("q") ?? ""));
  if (method === "GET" && !id) {
    if (resource === "radar") {
      if (account.role === "admin") throw new RequestError(403, "Peta radar tersedia untuk Petani dan PPL.");
      return json(await radarSnapshot());
    }
    if (resource === "weather") {
      if (account.role === "admin") throw new RequestError(403, "Cuaca wilayah tersedia untuk Petani dan PPL.");
      return json(await getWeather());
    }
  }

  const requestedOwner = request.headers.get("x-vektor-account");
  if (requestedOwner && requestedOwner !== account.id) {
    throw new RequestError(403, "Masuk kembali dengan akun pemilik laporan.");
  }

  if (resource === "reports" && !id) {
    if (method === "GET") {
      const staff = params.get("scope") === "ppl";
      if (staff && account.role !== "officer") throw new RequestError(403, "Hanya PPL yang dapat melihat antrean.");
      if (!staff) requireFarmer(account);
      return json(await listReports(account, params, staff));
    }
    if (method === "POST") {
      requireFarmer(account);
      if (!requestedOwner) throw new RequestError(403, "Masuk kembali dengan akun pemilik laporan.");
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
    if (account.role !== "officer")
      throw new RequestError(403, "Hanya PPL yang dapat melihat atau mengoreksi keputusan.");
    const reportId = uuid.parse(id);
    if (method === "GET") return json(await listReportReviews(reportId, pageNumber(params)));
    if (method === "PATCH") {
      await reviewReport(reportId, account, reviewCorrectionInput.parse(await request.json()));
      return json({ ok: true });
    }
  }
  if (resource === "plots" && !action) {
    requireFarmer(account);
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
    requireFarmer(account);
    if (!id && method === "GET") return json(await listAlerts(account.id));
    if (id && method === "PATCH") {
      await readAlert(account.id, uuid.parse(id));
      return json({ ok: true });
    }
  }
  if (resource === "push" && !id) {
    requireFarmer(account);
    if (method === "POST") {
      if (!pushConfig()) throw new RequestError(503, "Notifikasi perangkat belum dikonfigurasi.");
      await putSubscription(account.id, await request.json());
      return json({ ok: true }, 201);
    }
    if (method === "DELETE") {
      const { endpoint } = pushEndpoint.parse(await request.json());
      await removeSubscription(account.id, endpoint);
      return json({ ok: true });
    }
  }
  if (resource === "push" && id === "status" && !action && method === "POST") {
    requireFarmer(account);
    const { endpoint } = pushEndpoint.parse(await request.json());
    return json({ subscribed: await ownsSubscription(account.id, endpoint) });
  }
  return null;
}
