export const passwordMinimum = 10;
export const whatsappOtpLength = 6;
export const whatsappOtpExpiry = 300;
export const whatsappNumberPattern = /^\+[1-9]\d{7,14}$/;

export function normalizeWhatsAppNumber(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  const phone = compact.startsWith("08")
    ? `+62${compact.slice(1)}`
    : compact.startsWith("62")
      ? `+${compact}`
      : compact;
  return whatsappNumberPattern.test(phone) ? phone : null;
}
