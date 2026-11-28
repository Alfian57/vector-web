import { requireDashboardAccount } from "@/lib/server/dashboard-access";
import { recordPageView } from "@/lib/server/activity-log";

export async function recordAdminPage(path: string, auditPath = path) {
  const account = await requireDashboardAccount(path, "admin");
  await recordPageView(account, auditPath);
}
