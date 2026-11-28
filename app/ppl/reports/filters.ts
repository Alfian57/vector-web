import { findLabel } from "@/lib/domain";
import { parsePageIndex } from "@/lib/query-state";

export function reportQueueFilters(params: Pick<URLSearchParams, "get">) {
  const status = params.get("status");
  const finding = findLabel.safeParse(params.get("finding"));
  return {
    status: status === "" || status === "verified" || status === "rejected" ? status : "pending",
    finding: finding.success ? finding.data : "",
    page: parsePageIndex(params.get("page")),
  };
}

export function reportQueueQuery({ status, finding, page }: ReturnType<typeof reportQueueFilters>) {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", status);
  if (finding) params.set("finding", finding);
  if (page) params.set("page", String(page));
  return params;
}

export function withReportQuery(path: string, query: URLSearchParams) {
  return query.size ? `${path}?${query}` : path;
}
