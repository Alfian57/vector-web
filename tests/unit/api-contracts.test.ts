import { describe, expect, test } from "bun:test";
import { accountSchema, districtCollectionSchema, reportPageResponseSchema } from "../../lib/api-contracts";

const sampleReport = {
  id: "1a57c2b1-1e0e-4b92-bb0c-ddc720dfe084",
  observedAt: "2026-11-26T17:00:00.000Z",
  longitude: 107.343,
  latitude: -6.308,
  finding: "blast",
  notes: "Bercak pada daun.",
  status: "pending",
  severity: null,
  reviewNote: null,
  reviewRevision: 0,
  districtId: "32-15-01",
  districtName: "Karawang Barat",
};

describe("client API response contracts", () => {
  test("accepts a report page and rejects malformed response data", () => {
    expect(reportPageResponseSchema.safeParse({ reports: [sampleReport], hasMore: false }).success).toBe(true);
    expect(
      reportPageResponseSchema.safeParse({ reports: [{ ...sampleReport, latitude: 91 }], hasMore: false }).success,
    ).toBe(false);
    expect(reportPageResponseSchema.safeParse({ reports: [sampleReport], hasMore: "false" }).success).toBe(false);
  });

  test("rejects accounts with an unknown role", () => {
    expect(accountSchema.safeParse({ id: "account-1", name: "Dewi", role: "farmer" }).success).toBe(true);
    expect(accountSchema.safeParse({ id: "account-1", name: "Dewi", role: "superuser" }).success).toBe(false);
  });

  test("validates only the district properties consumed by the map", () => {
    expect(
      districtCollectionSchema.safeParse({ features: [{ properties: { id: "32-15-01", name: "Karawang Barat" } }] })
        .success,
    ).toBe(true);
    expect(districtCollectionSchema.safeParse({ features: [{ properties: { id: "32-15-01" } }] }).success).toBe(false);
  });
});
