import type { Account } from "@/lib/domain";
import { RequestError } from "../http";
import { writeActivitySafely } from "../activity-log";

export type ApiRouteContext = {
  request: Request;
  segments: string[];
  method: string;
  endpoint: string;
  params: URLSearchParams;
  account: Account;
};

export function pageNumber(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10_000) {
    throw new RequestError(422, "Nomor halaman tidak valid.");
  }
  return page;
}

export async function auditRequest<T extends Response>(
  actor: Account,
  method: string,
  endpoint: string,
  run: () => Promise<T>,
) {
  if (method === "GET" || (endpoint === "push/status" && method === "POST")) return run();
  const category =
    endpoint.startsWith("admin/education") || endpoint.startsWith("education/")
      ? "education"
      : endpoint.startsWith("admin/accounts")
        ? "account"
        : endpoint.startsWith("admin/")
          ? "admin"
          : "api";
  const routeName =
    endpoint
      .split("/")
      .slice(0, 2)
      .join(".")
      .replace(/[^a-z0-9_.-]/gi, "")
      .slice(0, 60) || "request";
  try {
    const response = await run();
    await writeActivitySafely({
      category,
      action: `api.${method.toLowerCase()}.${routeName}`,
      actor,
      outcome: response.status < 400 ? "success" : "failure",
      summary: `Permintaan ${method} ${routeName} ${response.status < 400 ? "berhasil" : "gagal"} (${response.status}).`,
    });
    return response;
  } catch (error) {
    await writeActivitySafely({
      category,
      action: `api.${method.toLowerCase()}.${routeName}`,
      actor,
      outcome: "failure",
      summary: `Permintaan ${method} ${routeName} gagal.`,
    });
    throw error;
  }
}
