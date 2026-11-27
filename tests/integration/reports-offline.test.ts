import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { maxPhotoBytes } from "../../lib/domain";
import { db } from "../../lib/server/db";
import {
  createWhatsAppAccount,
  districtOffsetPoint,
  makeJpeg,
  resetMutableState,
  submitReport,
  TestSession,
} from "./helpers/test-kit";

describe("P0.2 reports API idempotency and validation", () => {
  let farmerA: TestSession;
  let farmerB: TestSession;
  let ownerA: { id: string };
  let ownerB: { id: string };
  let point: { id: string; longitude: number; latitude: number };

  beforeAll(async () => {
    await resetMutableState();
    farmerA = new TestSession();
    farmerB = new TestSession();
    ownerA = await createWhatsAppAccount(farmerA, { name: "Petani Laporan A" });
    ownerB = await createWhatsAppAccount(farmerB, { name: "Petani Laporan B" });
    point = await districtOffsetPoint("32-15-13");
  });

  afterAll(async () => {
    await db().$disconnect();
  });

  test("same report ID with identical payload creates one report; different payload or photo returns 409", async () => {
    const clientId = randomUUID();
    const observedAt = new Date(Date.now() - 10_000).toISOString();
    const photoA = await makeJpeg(20, 80, 30);
    const photoDifferent = await makeJpeg(90, 40, 20);

    const [first, second] = await Promise.all([
      submitReport(farmerA, ownerA.id, {
        id: clientId,
        longitude: point.longitude,
        latitude: point.latitude,
        observedAt,
        finding: "blast",
        notes: "Daun bergejala",
        photo: photoA,
      }),
      submitReport(farmerA, ownerA.id, {
        id: clientId,
        longitude: point.longitude,
        latitude: point.latitude,
        observedAt,
        finding: "blast",
        notes: "Daun bergejala",
        photo: photoA,
      }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    const id1 = ((await first.json()) as { id: string }).id;
    const id2 = ((await second.json()) as { id: string }).id;
    expect(id1).toBe(id2);

    // Sequential retry also returns 200 with same ID
    const third = await submitReport(farmerA, ownerA.id, {
      id: clientId,
      longitude: point.longitude,
      latitude: point.latitude,
      observedAt,
      finding: "blast",
      notes: "Daun bergejala",
      photo: photoA,
    });
    expect(third.status).toBe(200);
    expect(((await third.json()) as { id: string }).id).toBe(id1);

    // Same ID with modified notes -> 409
    const changedNotes = await submitReport(farmerA, ownerA.id, {
      id: clientId,
      longitude: point.longitude,
      latitude: point.latitude,
      observedAt,
      finding: "blast",
      notes: "Isi berbeda",
      photo: photoA,
    });
    expect(changedNotes.status).toBe(409);

    // Same ID with modified photo bytes -> 409
    const changedPhoto = await submitReport(farmerA, ownerA.id, {
      id: clientId,
      longitude: point.longitude,
      latitude: point.latitude,
      observedAt,
      finding: "blast",
      notes: "Daun bergejala",
      photo: photoDifferent,
    });
    expect(changedPhoto.status).toBe(409);

    expect(await db().report.count({ where: { ownerId: ownerA.id, clientId } })).toBe(1);

    // Same clientId owned by a different farmer is isolated by (owner_id, client_id)
    const otherOwnerSameClientId = await submitReport(farmerB, ownerB.id, {
      id: clientId,
      longitude: point.longitude,
      latitude: point.latitude,
      observedAt,
      finding: "blast",
      notes: "Daun bergejala",
      photo: photoA,
    });
    expect(otherOwnerSameClientId.status).toBe(201);
  });

  test("rejects out-of-Karawang coordinates, future observedAt, invalid photos, and oversized requests", async () => {
    const validPhoto = await makeJpeg();

    // Outside Karawang (Bandung)
    const outsideKarawang = await submitReport(farmerA, ownerA.id, {
      longitude: 107.6191,
      latitude: -6.9175,
      photo: validPhoto,
    });
    expect(outsideKarawang.status).toBe(422);

    // Future observedAt
    const futureTime = await submitReport(farmerA, ownerA.id, {
      longitude: point.longitude,
      latitude: point.latitude,
      observedAt: new Date(Date.now() + 120_000).toISOString(),
      photo: validPhoto,
    });
    expect(futureTime.status).toBe(422);

    // Invalid coordinates in payload
    const invalidCoords = await submitReport(farmerA, ownerA.id, {
      longitude: 181,
      latitude: point.latitude,
      photo: validPhoto,
    });
    expect(invalidCoords.status).toBe(422);

    // Corrupt image bytes
    const corruptPhoto = await submitReport(farmerA, ownerA.id, {
      longitude: point.longitude,
      latitude: point.latitude,
      photo: Buffer.from("not-an-image-payload"),
    });
    expect(corruptPhoto.status).toBe(422);

    // Photo slightly above maxPhotoBytes (caught by form field limit -> 422)
    const overFieldLimit = await submitReport(farmerA, ownerA.id, {
      longitude: point.longitude,
      latitude: point.latitude,
      photo: Buffer.alloc(maxPhotoBytes + 100, 1),
    });
    expect(overFieldLimit.status).toBe(422);

    // Request exceeding maxPhotoBytes + 20_000 (caught at body stream / content-length limit -> 413)
    const overStreamLimit = await submitReport(farmerA, ownerA.id, {
      longitude: point.longitude,
      latitude: point.latitude,
      photo: Buffer.alloc(maxPhotoBytes + 25_000, 1),
    });
    expect(overStreamLimit.status).toBe(413);

    // Wrong content-type (JSON instead of multipart)
    const jsonRequest = await farmerA.postJson(
      "/api/reports",
      { id: randomUUID() },
      { headers: { "x-vektor-account": ownerA.id } },
    );
    expect(jsonRequest.status).toBe(422);
  });
});
