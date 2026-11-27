import { db } from "../lib/server/db";
import { normalizeWhatsAppNumber } from "../lib/whatsapp";

try {
  const identity = process.argv[2]?.trim().toLowerCase();
  if (!identity) throw new Error("Usage: bun run officer:grant +6281234567890");
  const phoneNumber = normalizeWhatsAppNumber(identity);
  if (!phoneNumber && !identity.includes("@")) throw new Error("Provide a valid WhatsApp number or email");
  const { count } = await db().user.updateMany({
    where: phoneNumber ? { phoneNumber, phoneNumberVerified: true } : { email: identity, emailVerified: true },
    data: { role: "officer", updatedAt: new Date() },
  });
  if (count !== 1) throw new Error("A verified account with this phone number or email is required");
  console.log("Officer access enabled");
} finally {
  await db().$disconnect();
}
