import { aidCorrectionInput, type AidAllocation, type AidCorrection, type AidDelivery, type Page } from "@/lib/domain";
import { deliveredAidQuantity, lockAidAllocation } from "./aid";
import { db, transaction } from "./db";
import { RequestError } from "./http";
import { bumpRevision } from "./radar";

const pageSize = 10;

export async function listAidCorrections(allocationId: string, page: number): Promise<Page<AidCorrection>> {
  const rows = await db().$queryRaw<AidCorrection[]>`
    SELECT c.id::text AS id, c.kind, c.reason, c.previous, c.current, u.name AS author, c.recorded_at AS "recordedAt"
    FROM aid_corrections c JOIN "user" u ON u.id = c.author_id
    WHERE c.allocation_id = ${allocationId}::uuid ORDER BY c.id DESC LIMIT ${pageSize + 1} OFFSET ${page * pageSize}
  `;
  return { entries: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

function allocationSnapshot({ districtName, item, quantity, unit, note }: Omit<AidAllocation, "deliveredQuantity">) {
  return { districtName, item, quantity, unit, note };
}

export async function correctAid(allocationId: string, authorId: string, body: unknown) {
  const input = aidCorrectionInput.parse(body);
  await transaction(async (client) => {
    const allocation = await lockAidAllocation(client, allocationId);
    const delivered = await deliveredAidQuantity(client, allocationId);
    let previous: AidCorrection["previous"];
    let current: AidCorrection["current"];
    let deliveryId: string | null = null;

    if (input.target === "allocation") {
      if (input.revision !== allocation.revision)
        throw new RequestError(409, "Alokasi sudah berubah. Buka kembali rincian terbaru.");
      if (input.quantity < delivered)
        throw new RequestError(409, "Jumlah alokasi lebih kecil daripada jumlah yang sudah disalurkan.");
      if (
        input.districtId !== allocation.districtId ||
        input.item !== allocation.item ||
        input.unit !== allocation.unit
      ) {
        const used = await client.aidDelivery.findFirst({ where: { allocationId }, select: { id: true } });
        if (used) throw new RequestError(409, "Kecamatan, barang, dan satuan terkunci setelah penyaluran dicatat.");
      }
      const district = await client.district.findUnique({
        where: { id: input.districtId },
        select: { id: true, name: true },
      });
      if (!district) throw new RequestError(422, "Kecamatan tidak ditemukan.");
      await client.$executeRaw`
        UPDATE aid_allocations SET district_id = ${district.id}, item = ${input.item}, quantity = ${input.quantity}::integer,
          unit = ${input.unit}, note = ${input.note}, revision = revision + 1,
          original_input = COALESCE(original_input, jsonb_build_object('districtId', district_id, 'item', item,
            'quantity', quantity, 'unit', unit, 'note', note))
        WHERE id = ${allocationId}::uuid
      `;
      previous = allocationSnapshot(allocation);
      current = {
        districtName: district.name,
        item: input.item,
        quantity: input.quantity,
        unit: input.unit,
        note: input.note,
      };
    } else {
      deliveryId = input.deliveryId;
      const [delivery] = await client.$queryRaw<
        Pick<AidDelivery, "recipient" | "quantity" | "note" | "voided" | "revision">[]
      >`
        SELECT recipient, quantity, note, voided_at IS NOT NULL AS voided, revision
        FROM aid_deliveries WHERE allocation_id = ${allocationId}::uuid AND id = ${deliveryId}::uuid
      `;
      if (!delivery) throw new RequestError(404, "Penyaluran tidak ditemukan.");
      if (delivery.voided || input.revision !== delivery.revision)
        throw new RequestError(409, "Penyaluran sudah berubah. Buka kembali riwayat terbaru.");
      const quantity = input.target === "delivery" ? input.quantity : delivery.quantity;
      const recipient = input.target === "delivery" ? input.recipient : delivery.recipient;
      const note = input.target === "delivery" ? input.note : delivery.note;
      const voided = input.target === "void-delivery";
      if (!voided && delivered - delivery.quantity + quantity > allocation.quantity) {
        throw new RequestError(409, "Jumlah penyaluran melebihi sisa alokasi.");
      }
      await client.$executeRaw`
        UPDATE aid_deliveries SET recipient = ${recipient}, quantity = ${quantity}::integer, note = ${note}, revision = revision + 1,
          voided_at = CASE WHEN ${voided}::boolean THEN clock_timestamp() ELSE NULL END,
          original_input = COALESCE(original_input, jsonb_build_object('recipient', recipient, 'quantity', quantity, 'note', note))
        WHERE allocation_id = ${allocationId}::uuid AND id = ${deliveryId}::uuid
      `;
      previous = {
        recipient: delivery.recipient,
        quantity: delivery.quantity,
        note: delivery.note,
        voided: delivery.voided,
      };
      current = { recipient, quantity, note, voided };
    }
    await client.aidCorrection.create({
      data: { allocationId, deliveryId, kind: input.target, reason: input.reason, previous, current, authorId },
    });
    await bumpRevision(client);
  });
}
