import { uuid } from "@/lib/domain";
import { changeAccountAccess, listAdminAccounts, adminOverview, searchAdminData, listActivityLogs } from "../admin";
import {
  archiveEducationArticle,
  getEducationForAdmin,
  restoreEducationArticle,
  listEducationForAdmin,
  saveEducationArticle,
} from "../education";
import { readEducationSaveRequest, uploadEducationImage } from "../education-media";
import { json, RequestError } from "../http";
import type { ApiRouteContext } from "./shared";

export async function handleAdminApi({
  request,
  segments,
  method,
  params,
  account,
}: ApiRouteContext): Promise<Response> {
  if (segments.length === 2 && segments[1] === "overview" && method === "GET") return json(await adminOverview());
  if (segments.length === 2 && segments[1] === "search" && method === "GET")
    return json(await searchAdminData(params.get("q") ?? ""));
  if (segments.length === 2 && segments[1] === "accounts" && method === "GET")
    return json(await listAdminAccounts(params));
  if (segments.length === 3 && segments[1] === "accounts" && method === "PATCH") {
    await changeAccountAccess(account, segments[2], await request.json());
    return json({ ok: true });
  }
  if (segments.length === 2 && segments[1] === "logs" && method === "GET") return json(await listActivityLogs(params));
  if (segments.length === 2 && segments[1] === "education" && method === "GET")
    return json(await listEducationForAdmin(params));
  if (segments.length === 2 && segments[1] === "education" && method === "POST") {
    const { body, images } = await readEducationSaveRequest(request);
    return json(await saveEducationArticle(account, undefined, body, images), 201);
  }
  if (segments.length === 3 && segments[1] === "education" && method === "GET") {
    return json(await getEducationForAdmin(uuid.parse(segments[2])));
  }
  if (segments.length === 3 && segments[1] === "education" && method === "PATCH") {
    const { body, images } = await readEducationSaveRequest(request);
    if (typeof body === "object" && body !== null && "action" in body && body.action === "restore") {
      await restoreEducationArticle(account, uuid.parse(segments[2]));
      return json({ ok: true });
    }
    if (typeof body === "object" && body !== null && "status" in body && body.status === "archived") {
      await archiveEducationArticle(account, uuid.parse(segments[2]));
      return json({ ok: true });
    }
    return json(await saveEducationArticle(account, uuid.parse(segments[2]), body, images));
  }
  if (segments.length === 3 && segments[1] === "education" && method === "DELETE") {
    await archiveEducationArticle(account, uuid.parse(segments[2]));
    return json({ ok: true });
  }
  if (segments.length === 4 && segments[1] === "education" && segments[3] === "images" && method === "POST") {
    return json(await uploadEducationImage(account, uuid.parse(segments[2]), request), 201);
  }
  throw new RequestError(404, "Halaman tidak ditemukan.");
}
