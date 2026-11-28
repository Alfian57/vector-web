import { findLabel } from "@/lib/domain";

export type ReportFilters = { status: string; finding: string };

export function readReportFilters(href: string): ReportFilters {
  const params = new URL(href, "https://vektor.invalid").searchParams;
  const status = params.get("status") ?? "";
  const finding = params.get("finding") ?? "";

  return {
    status: status === "pending" || status === "verified" || status === "rejected" ? status : "",
    finding: findLabel.safeParse(finding).success ? finding : "",
  };
}
