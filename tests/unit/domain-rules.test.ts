import { describe, expect, test } from "bun:test";
import {
  aidAllocationInput,
  aidCorrectionInput,
  aidDeliveryInput,
  broadcastInput,
  followUpSubmission,
  formatDate,
  maxAidQuantity,
  plotInput,
  position,
  reportInput,
  reviewCorrectionInput,
} from "../../lib/domain";
import {
  dashboardReturnPath,
  officerPath,
  profilePath,
  radarPath,
  radarScreen,
  radarReportEditPath,
  officerReportPath,
  adminArticleEditPath,
  radarSectionPath,
  signInFor,
} from "../../lib/routes";

const sampleId = "1a57c2b1-1e0e-4b92-bb0c-ddc720dfe084";
const sampleDeliveryId = "2b68d3c2-2f1f-4c03-8c1d-eed831eaf195";

describe("domain boundaries and validation", () => {
  test("validates coordinate ranges and rejects non-finite values", () => {
    expect(position.safeParse({ longitude: -180, latitude: -90 }).success).toBe(true);
    expect(position.safeParse({ longitude: 180, latitude: 90 }).success).toBe(true);
    for (const bad of [
      { longitude: -180.001, latitude: 0 },
      { longitude: 180.001, latitude: 0 },
      { longitude: 0, latitude: -90.001 },
      { longitude: 0, latitude: 90.001 },
      { longitude: Number.NaN, latitude: -6.3 },
      { longitude: 107.3, latitude: Number.POSITIVE_INFINITY },
    ]) {
      expect(position.safeParse(bad).success).toBe(false);
    }
  });

  test("validates report notes limit and observedAt ISO format", () => {
    const base = {
      id: sampleId,
      observedAt: "2026-11-26T17:00:00.000Z",
      longitude: 107.343,
      latitude: -6.308,
      finding: "blast" as const,
      notes: "a".repeat(600),
    };
    expect(reportInput.safeParse(base).success).toBe(true);
    expect(reportInput.safeParse({ ...base, notes: "a".repeat(601) }).success).toBe(false);
    expect(reportInput.safeParse({ ...base, observedAt: "2026-11-26T17:00:00+07:00" }).success).toBe(false);
  });

  test("validates review correction revision and reason", () => {
    expect(
      reviewCorrectionInput.safeParse({
        status: "verified",
        finding: "blast",
        severity: "severe",
        note: "",
        revision: 0,
        reason: "  Diperiksa ulang  ",
      }).success,
    ).toBe(true);
    expect(
      reviewCorrectionInput.safeParse({
        status: "rejected",
        note: "Foto buram",
        revision: 1,
        reason: "   ",
      }).success,
    ).toBe(false);
    expect(
      reviewCorrectionInput.safeParse({
        status: "rejected",
        note: "Foto buram",
        revision: -1,
        reason: "Alasan valid",
      }).success,
    ).toBe(false);
  });

  test("validates plots, broadcasts, follow-ups, and aid schemas", () => {
    expect(plotInput.safeParse({ name: "  Petak A ", longitude: 107.3, latitude: -6.3 }).success).toBe(true);
    expect(plotInput.safeParse({ name: "   ", longitude: 107.3, latitude: -6.3 }).success).toBe(false);
    expect(plotInput.safeParse({ name: "x".repeat(81), longitude: 107.3, latitude: -6.3 }).success).toBe(false);

    expect(broadcastInput.safeParse({ districtId: "32-15-03", title: "Peringatan", body: "Isi" }).success).toBe(true);
    expect(broadcastInput.safeParse({ districtId: "32_15_03", title: "Peringatan", body: "Isi" }).success).toBe(false);

    expect(
      followUpSubmission.safeParse({
        id: sampleId,
        districtId: "32-15-03",
        kind: "outreach",
        status: "planned",
        note: "Kunjungan",
      }).success,
    ).toBe(true);
    expect(
      followUpSubmission.safeParse({
        districtId: "32-15-03",
        kind: "other",
        status: "planned",
        note: "Kunjungan",
      }).success,
    ).toBe(false);

    expect(
      aidAllocationInput.safeParse({
        id: sampleId,
        districtId: "32-15-03",
        item: "Perangkap",
        quantity: maxAidQuantity,
        unit: "unit",
      }).success,
    ).toBe(true);
    expect(
      aidAllocationInput.safeParse({
        id: sampleId,
        districtId: "32-15-03",
        item: "Perangkap",
        quantity: maxAidQuantity + 1,
        unit: "unit",
      }).success,
    ).toBe(false);
    expect(
      aidDeliveryInput.safeParse({
        id: sampleDeliveryId,
        recipient: "Poktan",
        quantity: 0,
      }).success,
    ).toBe(false);
    expect(
      aidCorrectionInput.safeParse({
        target: "void-delivery",
        deliveryId: sampleDeliveryId,
        revision: 0,
        reason: "Batal",
      }).success,
    ).toBe(true);
  });

  test("formats dates in Asia/Jakarta across UTC midnight", () => {
    const beforeWibMidnight = formatDate("2026-11-26T16:59:00.000Z");
    const atWibMidnight = formatDate("2026-11-26T17:00:00.000Z");
    expect(beforeWibMidnight).toContain("26 Nov 2026");
    expect(beforeWibMidnight).toContain("23.59");
    expect(atWibMidnight).toContain("27 Nov 2026");
    expect(atWibMidnight).toContain("00.00");
  });

  test("resolves safe radar routes and rejects external return paths", () => {
    expect(radarScreen("/radar/alerts")).toEqual({ section: "radar" });
    expect(radarScreen("/radar/unknown")).toBeUndefined();
    expect(radarScreen(radarReportEditPath(sampleId))).toEqual({ section: "edit", id: sampleId });
    expect(radarSectionPath("radar")).toBe("/radar");
    expect(radarSectionPath("reports")).toBe("/radar/reports");
    expect(signInFor("/radar/alerts")).toBe("/masuk?next=%2Fradar%2Falerts");
    expect(dashboardReturnPath(officerPath)).toBe(officerPath);
    expect(dashboardReturnPath(radarPath)).toBe(radarPath);
    expect(dashboardReturnPath(profilePath)).toBe(profilePath);
    expect(dashboardReturnPath("/radar?view=alerts")).toBe("/radar");
    expect(dashboardReturnPath("/radar?view=create")).toBe("/radar/reports");
    expect(dashboardReturnPath(`${officerReportPath(sampleId)}?status=verified&page=1`)).toBe(
      `${officerReportPath(sampleId)}?status=verified&page=1`,
    );
    const allocationDetail = `/ppl/aid-allocations/${sampleId}`;
    expect(dashboardReturnPath(allocationDetail)).toBe(allocationDetail);
    expect(dashboardReturnPath(`/admin/education?article=${sampleId}`)).toBe(adminArticleEditPath(sampleId));
    for (const invalid of [
      "/ppl/reports/../../api/session",
      "/radar/%2F%2Fevil.example",
      "/radar/reports/garbage/edit",
    ])
      expect(dashboardReturnPath(invalid)).toBeUndefined();
    expect(dashboardReturnPath("https://evil.example/")).toBeUndefined();
    expect(dashboardReturnPath("//evil.example")).toBeUndefined();
  });
});
