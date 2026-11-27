import { correctAid, listAidCorrections } from "../aid-corrections";
import { createAidAllocation, listAidAllocations, listAidDeliveries, recordAidDelivery } from "../aid";
import { broadcast, listFollowUpEntries, listFollowUps, writeFollowUp } from "../monitoring";
import { json, RequestError } from "../http";
import { uuid } from "@/lib/domain";
import type { ApiRouteContext } from "./shared";
import { pageNumber } from "./shared";

export async function handleOfficerApi({
  request,
  segments,
  method,
  params,
  account,
}: ApiRouteContext): Promise<Response | null> {
  const [resource, id, action] = segments;
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
      return json(
        params.get("history") === "corrections"
          ? await listAidCorrections(allocationId, page)
          : await listAidDeliveries(allocationId, page),
      );
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
  return null;
}
