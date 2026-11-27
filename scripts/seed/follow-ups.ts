import type { DatabaseTransaction } from "../../lib/server/db";
import { followUps } from "../seed-data";
import { ago, demoId, officer } from "./shared";

export async function seedFollowUps(client: DatabaseTransaction) {
  // Insert the most recent snapshot first and preserve any follow-up already in use.
  for (const { key, hoursAgo, ...entry } of [...followUps].reverse()) {
    const id = demoId(key);
    const recordedAt = ago(hoursAgo);
    const data = { ...entry, authorId: officer.id };
    await client.followUpEntry.upsert({ where: { id }, create: { ...data, id, recordedAt }, update: {} });
    await client.followUp.upsert({
      where: { districtId_kind: { districtId: entry.districtId, kind: entry.kind } },
      create: { ...data, updatedAt: recordedAt },
      update: {},
    });
  }
}
