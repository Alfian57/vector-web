import { describe, expect, test } from "bun:test";
import { reportInput, reviewInput, subscriptionInput } from "../../lib/domain";

const report = {
  id: "1a57c2b1-1e0e-4b92-bb0c-ddc720dfe084",
  observedAt: "2026-08-31T09:30:00.000Z",
  longitude: 107.343,
  latitude: -6.308,
  finding: "unknown" as const,
  notes: "  Daun menguning  ",
};

describe("field reports", () => {
  test("a manual report can be recorded with unknown finding", () => {
    expect(reportInput.parse(report)).toEqual({ ...report, notes: "Daun menguning" });
  });

  test("invalid values are rejected at the API boundary", () => {
    for (const invalid of [
      { finding: "Belum diketahui" },
      { latitude: -91 },
      { longitude: "107.343" },
      { observedAt: "2026-08-31 09:30" },
      { id: "" },
    ]) {
      expect(reportInput.safeParse({ ...report, ...invalid }).success).toBe(false);
    }
  });

  test("approval requires a finding and rejection requires a reason", () => {
    expect(reviewInput.safeParse({ status: "verified", finding: "unknown", severity: "mild", note: "" }).success).toBe(false);
    expect(reviewInput.safeParse({ status: "verified", finding: "blast", severity: "mild", note: "" }).success).toBe(true);
    expect(reviewInput.safeParse({ status: "rejected", note: "  " }).success).toBe(false);
    expect(reviewInput.safeParse({ status: "rejected", note: "Foto tidak jelas" }).success).toBe(true);
  });

  test("push recipients must use supported HTTPS endpoints", () => {
    const keys = { p256dh: "a".repeat(87), auth: "a".repeat(22) };
    expect(subscriptionInput.safeParse({ endpoint: "https://fcm.googleapis.com/fcm/send/123", keys }).success).toBe(true);
    expect(subscriptionInput.safeParse({ endpoint: "https://fcm.googleapis.com.example.test/123", keys }).success).toBe(false);
    expect(subscriptionInput.safeParse({ endpoint: "http://127.0.0.1:3000/123", keys }).success).toBe(false);
  });
});
