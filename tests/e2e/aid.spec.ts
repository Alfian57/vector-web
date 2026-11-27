import { randomUUID } from "node:crypto";
import { devices, expect, test } from "@playwright/test";
import type { AidAllocations, AidCorrection, AidHistory, Page, RadarSnapshot } from "../../lib/domain";
import { db } from "../../lib/server/db";
import { account, baseURL, createPhoneGenerator, origin } from "./helpers/pilot-fixtures";

const phone = createPhoneGenerator(20);

test.afterAll(async () => {
  await db().$disconnect();
});

test("PPL records aid allocations and concurrent deliveries stay within the balance", async ({ browser }) => {
  const farmer = await browser.newContext({ baseURL });
  const staff = await browser.newContext({ ...devices["Pixel 7"], baseURL });
  const page = await staff.newPage();
  const path = "/api/ppl/aid-allocations";
  const districtId = "32-15-03";
  const item = `Sarung tangan ${randomUUID().slice(0, 8)}`;

  try {
    await Promise.all([account(farmer, phone(), "Petani bantuan"), account(staff, phone(), "PPL bantuan", true)]);
    await page.goto("/ppl");
    const aid = page.getByRole("region", { name: "Alokasi bantuan" });
    await expect(aid.getByLabel("Nama barang")).toHaveAttribute("placeholder", "Contoh: Perangkap kuning");
    await expect(aid.getByLabel("Nama barang")).toHaveAttribute("required", "");
    await expect(aid.getByLabel("Catatan (opsional)")).toBeVisible();
    await aid.getByLabel("Kecamatan penerima").selectOption(districtId);
    await aid.getByLabel("Nama barang").fill(item);
    await aid.getByLabel("Jumlah alokasi").fill("12");
    await aid.getByLabel("Satuan").fill("pasang");
    const radarBefore = (await (await staff.request.get("/api/radar")).json()) as RadarSnapshot;
    await aid.getByRole("button", { name: "Simpan alokasi" }).click();
    await expect(aid.getByText("Alokasi bantuan tersimpan.")).toBeVisible();
    await expect(aid.getByText("Sisa 12 pasang")).toBeVisible();
    expect(await (await staff.request.get("/api/radar")).json()).toEqual(radarBefore);

    const list = await staff.request.get(path);
    expect(list.ok()).toBeTruthy();
    const allocations = (await list.json()) as AidAllocations;
    const allocation = allocations.allocations.find((row) => row.item === item)!;
    expect(allocation).toMatchObject({ districtId, quantity: 12, deliveredQuantity: 0 });
    const deliveryPath = `${path}/${allocation.id}`;
    expect((await farmer.request.get(path)).status()).toBe(403);
    expect((await farmer.request.get(deliveryPath)).status()).toBe(403);
    expect((await farmer.request.post(path, { headers: origin, data: allocation })).status()).toBe(403);
    expect((await farmer.request.post(deliveryPath, { headers: origin, data: {} })).status()).toBe(403);
    expect((await staff.request.post(path, { headers: origin, data: allocation })).status()).toBe(200);
    expect((await staff.request.post(path, { headers: origin, data: { ...allocation, quantity: 15 } })).status()).toBe(
      409,
    );

    await aid.getByRole("button", { name: `Lihat penyaluran ${item}` }).click();
    await expect(aid.getByText("Belum ada penyaluran.")).toBeVisible();
    await aid.getByLabel("Kelompok penerima").fill("Kelompok Tani Sari");
    await aid.getByLabel("Jumlah penyaluran").fill("4");
    await aid.getByRole("button", { name: "Simpan penyaluran" }).click();
    await expect(aid.getByText("Penyaluran tersimpan.")).toBeVisible();
    await expect(aid.getByText("Kelompok Tani Sari")).toBeVisible();
    await expect(aid.getByText("Penyaluran sebagian")).toBeVisible();
    await expect(aid.getByText("Sisa 8 pasang")).toBeVisible();

    const deliveries = ["Sejahtera", "Sumber Padi"].map((name) => ({
      id: randomUUID(),
      recipient: `Kelompok Tani ${name}`,
      quantity: 8,
    }));
    const results = await Promise.all(
      deliveries.map((data) => staff.request.post(deliveryPath, { headers: origin, data })),
    );
    expect(results.map((result) => result.status()).sort()).toEqual([201, 409]);
    const saved = deliveries[results.findIndex((result) => result.status() === 201)];
    expect((await staff.request.post(deliveryPath, { headers: origin, data: saved })).status()).toBe(200);
    expect(
      (await staff.request.post(deliveryPath, { headers: origin, data: { ...saved, quantity: 1 } })).status(),
    ).toBe(409);
    const history = (await (await staff.request.get(deliveryPath)).json()) as AidHistory;
    expect(history.deliveries.map(({ quantity }) => quantity)).toEqual([8, 4]);
    await expect(aid.getByText("Seluruh alokasi sudah disalurkan.")).toBeVisible({ timeout: 12_000 });
    await expect(aid.getByRole("button", { name: "Simpan penyaluran" })).toBeHidden();

    const allocationEdit = { ...allocation, target: "allocation", reason: "Stok dicocokkan kembali", quantity: 16 };
    expect((await farmer.request.patch(deliveryPath, { headers: origin, data: allocationEdit })).status()).toBe(403);
    expect(
      (
        await staff.request.patch(deliveryPath, { headers: origin, data: { ...allocationEdit, quantity: 11 } })
      ).status(),
    ).toBe(409);
    const detail = aid.getByRole("region", { name: `Penyaluran ${item}` });
    await detail.getByRole("button", { name: "Koreksi alokasi", exact: true }).click();
    await detail.getByLabel("Jumlah alokasi").fill("16");
    await detail.getByLabel("Alasan koreksi bantuan").fill(allocationEdit.reason);
    await detail.getByRole("button", { name: "Simpan koreksi bantuan" }).click();
    await expect(aid.getByText("Sisa 4 pasang")).toBeVisible();
    expect((await staff.request.post(path, { headers: origin, data: allocation })).status()).toBe(200);
    expect((await staff.request.patch(deliveryPath, { headers: origin, data: allocationEdit })).status()).toBe(409);
    await detail.getByRole("button", { name: `Koreksi penyaluran ${saved.recipient}` }).click();
    await detail.getByLabel("Jumlah penyaluran").fill("6");
    await detail.getByLabel("Alasan koreksi bantuan").fill("Jumlah serah terima disesuaikan");
    await detail.getByRole("button", { name: "Simpan koreksi bantuan" }).click();
    await expect(aid.getByText("Sisa 6 pasang")).toBeVisible();
    expect((await staff.request.post(deliveryPath, { headers: origin, data: saved })).status()).toBe(200);
    await detail.getByRole("button", { name: `Batalkan penyaluran ${saved.recipient}` }).click();
    await detail.getByLabel("Alasan pembatalan").fill("Bukti penyaluran dibatalkan");
    await detail.getByRole("button", { name: "Konfirmasi pembatalan penyaluran" }).click();
    await expect(aid.getByText("Sisa 12 pasang")).toBeVisible();
    await expect(detail.getByText("Dibatalkan", { exact: true })).toBeVisible();
    await detail.getByText("Riwayat koreksi bantuan", { exact: true }).click();
    await expect(detail.getByText(/Bukti penyaluran dibatalkan/)).toBeVisible();
    const auditPath = `${deliveryPath}?history=corrections`;
    expect((await farmer.request.get(auditPath)).status()).toBe(403);
    const changes = (await (await staff.request.get(auditPath)).json()) as Page<AidCorrection>;
    expect(changes.entries).toMatchObject([
      { kind: "void-delivery", current: { voided: true } },
      { kind: "delivery", previous: { quantity: 8 }, current: { quantity: 6 } },
      { kind: "allocation", previous: { quantity: 12 }, current: { quantity: 16 } },
    ]);
  } finally {
    await Promise.all([farmer.close(), staff.close()]);
  }
});
