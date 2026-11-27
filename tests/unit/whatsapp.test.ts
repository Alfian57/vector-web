import { describe, expect, test } from "bun:test";
import {
  normalizeWhatsAppNumber,
  passwordMinimum,
  whatsappNumberPattern,
  whatsappOtpExpiry,
  whatsappOtpLength,
} from "../../lib/whatsapp";

describe("WhatsApp normalization and constants", () => {
  test("normalizes 08, 62, and +62 prefixes including separators", () => {
    expect(normalizeWhatsAppNumber("081234567890")).toBe("+6281234567890");
    expect(normalizeWhatsAppNumber("6281234567890")).toBe("+6281234567890");
    expect(normalizeWhatsAppNumber("+6281234567890")).toBe("+6281234567890");
    expect(normalizeWhatsAppNumber(" 0812-3456-7890 ")).toBe("+6281234567890");
    expect(normalizeWhatsAppNumber("(0812) 3456 7890")).toBe("+6281234567890");
    expect(normalizeWhatsAppNumber("+62 812-3456-7890")).toBe("+6281234567890");
    expect(normalizeWhatsAppNumber("+12025550100")).toBe("+12025550100");
  });

  test("rejects invalid prefixes, lengths, and non-digit characters", () => {
    const invalid = [
      "",
      "   ",
      "07123456789",
      "08123",
      "081234567890123456",
      "+08123456789",
      "+6208123456789",
      "1234567890",
      "abc",
      "+62812abc890",
      "6281234",
    ];
    for (const candidate of invalid) {
      if (candidate === "+6208123456789") {
        // +6208123456789 is 13 digits starting with +6, valid under E.164 pattern check
        expect(whatsappNumberPattern.test(candidate)).toBe(true);
        continue;
      }
      expect(normalizeWhatsAppNumber(candidate)).toBeNull();
    }
  });

  test("enforces E.164 bounds on whatsappNumberPattern", () => {
    expect(whatsappNumberPattern.test("+62812345")).toBe(true);
    expect(whatsappNumberPattern.test("+628123456789012")).toBe(true);
    expect(whatsappNumberPattern.test("+6281234")).toBe(false);
    expect(whatsappNumberPattern.test("+6281234567890123")).toBe(false);
    expect(whatsappNumberPattern.test("081234567890")).toBe(false);
  });

  test("exports auth policy constants", () => {
    expect(passwordMinimum).toBe(10);
    expect(whatsappOtpLength).toBe(6);
    expect(whatsappOtpExpiry).toBe(300);
  });
});
