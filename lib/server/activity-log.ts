import type { Account } from "@/lib/domain";
import type { DatabaseTransaction } from "./db";
import { db } from "./db";

export type ActivityInput = {
  kind?: "audit" | "system";
  category: string;
  action: string;
  outcome?: "success" | "failure";
  severity?: "warn" | "error";
  actor?: Pick<Account, "id" | "role"> | null;
  targetType?: string | null;
  targetId?: string | null;
  summary: string;
};

export async function writeActivity(input: ActivityInput, client: DatabaseTransaction | ReturnType<typeof db> = db()) {
  await client.activityLog.create({
    data: {
      kind: input.kind ?? "audit",
      category: input.category,
      action: input.action,
      outcome: input.outcome ?? "success",
      severity: input.severity,
      actorId: input.actor?.id ?? null,
      actorRole: input.actor?.role ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: input.summary.slice(0, 240),
    },
  });
}

export async function writeActivitySafely(input: ActivityInput) {
  try {
    await writeActivity(input);
  } catch {
    console.error("VEKTOR audit event could not be persisted", input.category, input.action);
  }
}

export async function recordPageView(account: Account | null, path: string) {
  if (!account) return;
  const safePath = path.split("?")[0].slice(0, 160);
  try {
    const recent = await db().activityLog.findFirst({
      where: { category: "page", action: "page.view", actorId: account.id, targetId: safePath, createdAt: { gte: new Date(Date.now() - 30_000) } },
      select: { id: true },
    });
    if (!recent) await writeActivity({
      category: "page", action: "page.view", actor: account, targetType: "page", targetId: safePath,
      summary: `Membuka ${safePath}`,
    });
  } catch {
    console.error("VEKTOR audit event could not be persisted", "page", "page.view");
  }
}
