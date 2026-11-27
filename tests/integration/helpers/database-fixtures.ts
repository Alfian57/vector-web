import { db } from "../../../lib/server/db";
import { resetFonnteStub } from "./fonnte-fixtures";
import { assertSafeTestDatabase } from "./test-environment";

export async function clearRateLimits() {
  assertSafeTestDatabase();
  await db().rateLimit.deleteMany();
}

export async function resetMutableState() {
  assertSafeTestDatabase();
  await resetFonnteStub();
  await db().$executeRawUnsafe(`
    TRUNCATE TABLE
      education_images,
      education_articles,
      activity_logs,
      worker_job_status,
      aid_corrections,
      aid_deliveries,
      aid_allocations,
      follow_up_entries,
      follow_ups,
      push_jobs,
      push_subscriptions,
      alert_recipients,
      alerts,
      report_review_history,
      report_photos,
      reports,
      plots,
      radar_counts,
      local_weather,
      session,
      account,
      verification,
      "rateLimit",
      "user"
    RESTART IDENTITY CASCADE
  `);
  await db().radarState.update({ where: { onlyRow: true }, data: { revision: 0 } });
}
