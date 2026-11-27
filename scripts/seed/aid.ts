import type { DatabaseTransaction } from "../../lib/server/db";
import { allocations, deliveries } from "../seed-data";
import { ago, demoId, officer } from "./shared";

export async function seedAid(client: DatabaseTransaction) {
  await client.aidAllocation.createMany({
    data: allocations.map(({ key, hoursAgo, ...input }) => ({
      ...input,
      id: demoId(key),
      authorId: officer.id,
      createdAt: ago(hoursAgo),
      originalInput: input,
    })),
    skipDuplicates: true,
  });
  for (const delivery of deliveries) {
    const { key, allocation, quantity, recipient, note, hoursAgo } = delivery;
    const id = demoId(key);
    const allocationId = demoId(allocation);
    const current = { quantity, recipient, note };
    const previous = { ...current, quantity: "previousQuantity" in delivery ? delivery.previousQuantity : quantity };
    const corrected = previous.quantity !== quantity;
    await client.aidDelivery.upsert({
      where: { allocationId_id: { allocationId, id } },
      create: {
        ...current,
        id,
        allocationId,
        recordedAt: ago(hoursAgo),
        authorId: officer.id,
        originalInput: previous,
        revision: Number(corrected),
      },
      update: {},
    });
    if (!corrected) continue;

    const reason = "Demo: jumlah dikoreksi berdasarkan berita acara serah terima.";
    const existing = await client.aidCorrection.findFirst({
      where: { allocationId, deliveryId: id, authorId: officer.id, reason },
    });
    if (!existing)
      await client.aidCorrection.create({
        data: {
          allocationId,
          deliveryId: id,
          kind: "delivery",
          reason,
          authorId: officer.id,
          recordedAt: ago(hoursAgo - 1),
          previous: { ...previous, voided: false },
          current: { ...current, voided: false },
        },
      });
  }
}
