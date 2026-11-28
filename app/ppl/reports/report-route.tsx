import { notFound, redirect } from "next/navigation";
import { uuid } from "@/lib/domain";
import { officerReportCorrectPath, officerReportPath, officerReportsPath } from "@/lib/routes";
import { findOfficerReport } from "@/lib/server/reports";
import { recordOfficerPage } from "../protected-dashboard";
import { OfficerReportDetail } from "./report-detail";

export async function OfficerReportRoute({ id, correcting = false }: { id: string; correcting?: boolean }) {
  if (!uuid.safeParse(id).success) notFound();
  const path = correcting ? officerReportCorrectPath(id) : officerReportPath(id);
  await recordOfficerPage(path, `${officerReportsPath}/[id]${correcting ? "/correct" : ""}`);
  const report = await findOfficerReport(id);
  if (!report) notFound();
  if (correcting && report.status === "pending") redirect(officerReportPath(id));
  return <OfficerReportDetail report={report} correcting={correcting} />;
}
