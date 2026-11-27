import { aidAllocationInput, aidDeliveryInput, type AidAllocation, type AidDelivery } from "@/lib/domain";
import { db, transaction, type DatabaseTransaction } from "./db";
import { RequestError } from "./http";
import { bumpRevision } from "./radar";

const pageSize = 10;

export async function lockAidAllocation(client: DatabaseTransaction, id: string) {
  const [allocation] = await client.$queryRaw<Omit<AidAllocation, "deliveredQuantity">[]>`
    SELECT a.id, a.district_id AS "districtId", d.name AS "districtName", a.item, a.quantity, a.unit, a.note, a.revision
    FROM aid_allocations a JOIN districts d ON d.id = a.district_id WHERE a.id = ${id}::uuid FOR UPDATE OF a
  `;
  if (!allocation) throw new RequestError(404, "Alokasi bantuan tidak ditemukan.");
  return allocation;
}

export async function deliveredAidQuantity(client: DatabaseTransaction, id: string) {
  const { _sum } = await client.aidDelivery.aggregate({
    where: { allocationId: id, voidedAt: null },
    _sum: { quantity: true },
  });
  return _sum.quantity ?? 0;
}

export async function listAidAllocations(page: number) {
  const rows = await db().$queryRaw<AidAllocation[]>`
    SELECT a.id, a.district_id AS "districtId", d.name AS "districtName", a.item, a.quantity, a.unit, a.note, a.revision,
      COALESCE((SELECT sum(s.quantity) FROM aid_deliveries s WHERE s.allocation_id = a.id AND s.voided_at IS NULL), 0)::integer AS "deliveredQuantity"
    FROM aid_allocations a JOIN districts d ON d.id = a.district_id
    ORDER BY a.created_at DESC, a.id DESC LIMIT ${pageSize + 1} OFFSET ${page * pageSize}
  `;
  return { allocations: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function createAidAllocation(authorId: string, body: unknown) {
  const { id, ...input } = aidAllocationInput.parse(body);
  const { districtId, item, quantity, unit, note } = input;
  return transaction(async (client) => {
    const created = await client.$executeRaw`
      INSERT INTO aid_allocations (id, district_id, item, quantity, unit, note, author_id, original_input)
      SELECT ${id}::uuid, id, ${item}, ${quantity}::integer, ${unit}, ${note}, ${authorId}, ${JSON.stringify(input)}::jsonb
      FROM districts WHERE id = ${districtId}
      ON CONFLICT (id) DO NOTHING
    `;
    if (created) {
      await bumpRevision(client);
      return true;
    }

    const [prior] = await client.$queryRaw<{ matches: boolean }[]>`
      SELECT author_id = ${authorId} AND COALESCE(original_input,
        jsonb_build_object('districtId', district_id, 'item', item, 'quantity', quantity, 'unit', unit, 'note', note)
      ) = ${JSON.stringify(input)}::jsonb AS matches
      FROM aid_allocations WHERE id = ${id}::uuid
    `;
    if (!prior) throw new RequestError(422, "Kecamatan tidak ditemukan.");
    if (!prior.matches) throw new RequestError(409, "ID alokasi sudah dipakai untuk isian lain.");
    return false;
  });
}

export async function listAidDeliveries(allocationId: string, page: number) {
  const rows = await db().$queryRaw<AidDelivery[]>`
    SELECT s.id, s.quantity, s.recipient, s.note, s.recorded_at AS "recordedAt", s.revision, s.voided_at IS NOT NULL AS voided
    FROM aid_deliveries s WHERE s.allocation_id = ${allocationId}::uuid
    ORDER BY s.recorded_at DESC, s.id DESC LIMIT ${pageSize + 1} OFFSET ${page * pageSize}
  `;
  return { deliveries: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function recordAidDelivery(allocationId: string, authorId: string, body: unknown) {
  const { id, ...input } = aidDeliveryInput.parse(body);
  const { recipient, quantity, note } = input;
  return transaction(async (client) => {
    // Hold the allocation lock through the balance check and insert so concurrent deliveries cannot overspend it.
    const allocation = await lockAidAllocation(client, allocationId);

    const [prior] = await client.$queryRaw<{ matches: boolean }[]>`
      SELECT author_id = ${authorId} AND COALESCE(original_input,
        jsonb_build_object('recipient', recipient, 'quantity', quantity, 'note', note)
      ) = ${JSON.stringify(input)}::jsonb AS matches
      FROM aid_deliveries WHERE allocation_id = ${allocationId}::uuid AND id = ${id}::uuid
    `;
    if (prior) {
      if (!prior.matches) throw new RequestError(409, "ID penyaluran sudah dipakai untuk isian lain.");
      return false;
    }

    const remaining = allocation.quantity - await deliveredAidQuantity(client, allocationId);
    if (quantity > remaining) throw new RequestError(409, "Jumlah penyaluran melebihi sisa alokasi.");

    await client.aidDelivery.create({
      data: { allocationId, id, recipient, quantity, note, authorId, originalInput: input },
    });
    await bumpRevision(client);
    return true;
  });
}
