import { stat } from "node:fs/promises";
import { join } from "node:path";
import { uuid } from "@/lib/domain";
import { getAccount } from "../auth";
import { json, RequestError } from "../http";
import { getPublishedArticle, listPublishedArticles } from "../education";
import { educationImage } from "../education-media";
import { pushConfig } from "../push-config";

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

export async function handlePublicApi(
  request: Request,
  segments: string[],
  params: URLSearchParams,
): Promise<Response | null> {
  const method = request.method;
  if (method === "GET" && segments.length === 1 && segments[0] === "map-package") {
    return json(await mapPackage());
  }
  if (method === "GET" && segments.length === 1 && segments[0] === "push-key") {
    return json({ key: pushConfig()?.publicKey ?? null });
  }
  if (method === "GET" && segments.length === 1 && segments[0] === "education") {
    return json(await listPublishedArticles(params));
  }
  if (method === "GET" && segments[0] === "education" && segments[1] === "images" && segments.length === 3) {
    const account = await getAccount(request.headers).catch(() => null);
    return educationImage(uuid.parse(segments[2]), account);
  }
  if (method === "GET" && segments[0] === "education" && segments.length === 2) {
    return json(await getPublishedArticle(segments[1]));
  }
  return null;
}
