import { RequestError } from "./http";

export function adminPageIndex(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10_000) {
    throw new RequestError(422, "Nomor halaman tidak valid.");
  }
  return page;
}
