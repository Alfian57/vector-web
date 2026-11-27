import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { AidAllocations, AidCorrection, AidHistory, Page } from "../../lib/domain";
import { db } from "../../lib/server/db";
import { createWhatsAppAccount, resetMutableState, TestSession } from "./helpers/test-kit";

describe("P1.5 aid allocations, deliveries, concurrency, corrections, and idempotency", () => {
  const cikampek = "32-15-13";
  const jatisari = "32-15-14";

  let officer: TestSession;
  let otherOfficer: TestSession;

  beforeEach(async () => {
    await resetMutableState();
    officer = new TestSession();
    otherOfficer = new TestSession();
    await createWhatsAppAccount(officer, { name: "PPL Bantuan 1", role: "officer" });
    await createWhatsAppAccount(otherOfficer, { name: "PPL Bantuan 2", role: "officer" });
  });

  afterAll(async () => {
    await db().$disconnect();
  });

  test("concurrent deliveries cannot exceed remaining allocation balance", async () => {
    const allocationId = randomUUID();
    const createAlloc = await officer.postJson("/api/ppl/aid-allocations", {
      id: allocationId,
      districtId: cikampek,
      item: "Perangkap kuning",
      quantity: 10,
      unit: "lembar",
      note: "Uji konkurensi",
    });
    expect(createAlloc.status).toBe(201);

    // Two concurrent requests each asking for 6 out of 10 -> exactly one succeeds (201), one gets 409
    const twoWay = await Promise.all([
      officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, {
        id: randomUUID(),
        recipient: "Poktan A",
        quantity: 6,
      }),
      officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, {
        id: randomUUID(),
        recipient: "Poktan B",
        quantity: 6,
      }),
    ]);
    expect(twoWay.map((r) => r.status).sort()).toEqual([201, 409]);

    // Five concurrent requests each asking for 2 against remaining 4 -> at most 2 succeed (201), 3 fail (409)
    const fiveWay = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, {
          id: randomUUID(),
          recipient: `Poktan C${index}`,
          quantity: 2,
        }),
      ),
    );
    const statuses = fiveWay.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 201, 409, 409, 409]);

    const allocations = (await (await officer.get("/api/ppl/aid-allocations")).json()) as AidAllocations;
    const saved = allocations.allocations.find((a) => a.id === allocationId);
    expect(saved?.deliveredQuantity).toBe(10);
  });

  test("corrections and voids update balance, enforce invariants, and record audit history", async () => {
    const allocationId = randomUUID();
    const deliveryId = randomUUID();

    expect(
      (
        await officer.postJson("/api/ppl/aid-allocations", {
          id: allocationId,
          districtId: cikampek,
          item: "Sarung tangan",
          quantity: 12,
          unit: "pasang",
          note: "Awal",
        })
      ).status,
    ).toBe(201);

    expect(
      (
        await officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, {
          id: deliveryId,
          recipient: "Poktan Maju",
          quantity: 8,
          note: "Tahap 1",
        })
      ).status,
    ).toBe(201);

    // Cannot reduce allocation below delivered quantity (8)
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "allocation",
          revision: 0,
          districtId: cikampek,
          item: "Sarung tangan",
          quantity: 7,
          unit: "pasang",
          note: "Awal",
          reason: "Salah hitung",
        })
      ).status,
    ).toBe(409);

    // Cannot change district/item/unit after a delivery exists
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "allocation",
          revision: 0,
          districtId: jatisari,
          item: "Sarung tangan",
          quantity: 12,
          unit: "pasang",
          note: "Awal",
          reason: "Pindah kecamatan",
        })
      ).status,
    ).toBe(409);

    // Valid allocation increase to 15
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "allocation",
          revision: 0,
          districtId: cikampek,
          item: "Sarung tangan",
          quantity: 15,
          unit: "pasang",
          note: "Ditambah",
          reason: "Tambahan stok",
        })
      ).status,
    ).toBe(200);

    // Stale allocation revision 0 rejected
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "allocation",
          revision: 0,
          districtId: cikampek,
          item: "Sarung tangan",
          quantity: 20,
          unit: "pasang",
          note: "Stale",
          reason: "Revisi lama",
        })
      ).status,
    ).toBe(409);

    // Delivery edit exceeding allocation (16 > 15) rejected
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "delivery",
          deliveryId,
          revision: 0,
          recipient: "Poktan Maju",
          quantity: 16,
          note: "Kelebihan",
          reason: "Uji batas",
        })
      ).status,
    ).toBe(409);

    // Valid delivery edit from 8 -> 5
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "delivery",
          deliveryId,
          revision: 0,
          recipient: "Poktan Maju Jaya",
          quantity: 5,
          note: "Disesuaikan",
          reason: "Berita acara direvisi",
        })
      ).status,
    ).toBe(200);

    let list = (await (await officer.get("/api/ppl/aid-allocations")).json()) as AidAllocations;
    expect(list.allocations[0]).toMatchObject({ id: allocationId, quantity: 15, deliveredQuantity: 5, revision: 1 });

    // Void delivery restores remaining balance to 15
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "void-delivery",
          deliveryId,
          revision: 1,
          reason: "Salah penerima",
        })
      ).status,
    ).toBe(200);

    // Cannot edit or double-void a voided delivery
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "void-delivery",
          deliveryId,
          revision: 2,
          reason: "Ulang",
        })
      ).status,
    ).toBe(409);

    list = (await (await officer.get("/api/ppl/aid-allocations")).json()) as AidAllocations;
    expect(list.allocations[0]).toMatchObject({ id: allocationId, quantity: 15, deliveredQuantity: 0 });

    const history = (await (await officer.get(`/api/ppl/aid-allocations/${allocationId}`)).json()) as AidHistory;
    expect(history.deliveries[0]).toMatchObject({ id: deliveryId, voided: true });

    // Full 15 units can now be delivered again
    expect(
      (
        await officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, {
          id: randomUUID(),
          recipient: "Poktan Baru",
          quantity: 15,
        })
      ).status,
    ).toBe(201);

    const corrections = (await (
      await officer.get(`/api/ppl/aid-allocations/${allocationId}?history=corrections`)
    ).json()) as Page<AidCorrection>;
    expect(corrections.entries).toMatchObject([
      { kind: "void-delivery", reason: "Salah penerima", current: { voided: true } },
      { kind: "delivery", reason: "Berita acara direvisi", previous: { quantity: 8 }, current: { quantity: 5 } },
      { kind: "allocation", reason: "Tambahan stok", previous: { quantity: 12 }, current: { quantity: 15 } },
    ]);
  });

  test("retries with same ID are idempotent even after corrections, and conflicting payloads return 409", async () => {
    const allocationId = randomUUID();
    const allocPayload = {
      id: allocationId,
      districtId: cikampek,
      item: "Benih tahan blas",
      quantity: 20,
      unit: "kg",
      note: "Awal",
    };

    expect((await officer.postJson("/api/ppl/aid-allocations", allocPayload)).status).toBe(201);
    expect((await officer.postJson("/api/ppl/aid-allocations", allocPayload)).status).toBe(200);
    expect((await officer.postJson("/api/ppl/aid-allocations", { ...allocPayload, quantity: 25 })).status).toBe(409);
    // Different officer reusing same ID -> 409
    expect((await otherOfficer.postJson("/api/ppl/aid-allocations", allocPayload)).status).toBe(409);

    const deliveryId = randomUUID();
    const deliveryPayload = { id: deliveryId, recipient: "Poktan 1", quantity: 5, note: "" };
    expect((await officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, deliveryPayload)).status).toBe(201);
    expect((await officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, deliveryPayload)).status).toBe(200);
    expect(
      (await officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, { ...deliveryPayload, quantity: 6 })).status,
    ).toBe(409);
    expect((await otherOfficer.postJson(`/api/ppl/aid-allocations/${allocationId}`, deliveryPayload)).status).toBe(409);

    // Retry using original input remains idempotent even after correction
    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "allocation",
          revision: 0,
          districtId: cikampek,
          item: "Benih tahan blas",
          quantity: 30,
          unit: "kg",
          note: "Awal",
          reason: "Revisi",
        })
      ).status,
    ).toBe(200);
    expect((await officer.postJson("/api/ppl/aid-allocations", allocPayload)).status).toBe(200);

    expect(
      (
        await officer.patchJson(`/api/ppl/aid-allocations/${allocationId}`, {
          target: "delivery",
          deliveryId,
          revision: 0,
          recipient: "Poktan 1",
          quantity: 7,
          note: "",
          reason: "Revisi serah terima",
        })
      ).status,
    ).toBe(200);
    expect((await officer.postJson(`/api/ppl/aid-allocations/${allocationId}`, deliveryPayload)).status).toBe(200);

    expect(await db().aidAllocation.count({ where: { id: allocationId } })).toBe(1);
    expect(await db().aidDelivery.count({ where: { allocationId, id: deliveryId } })).toBe(1);
  });
});
