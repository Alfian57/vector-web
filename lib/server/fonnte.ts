import { APIError } from "better-auth/api";
import { whatsappOtpExpiry, whatsappNumberPattern } from "@/lib/whatsapp";

const endpoint = "https://api.fonnte.com/send";
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

function gateway() {
  const testUrl = process.env.FONNTE_TEST_URL;
  if (!testUrl) return { url: endpoint, token: process.env.FONNTE_TOKEN?.trim() };
  const app = URL.parse(process.env.BETTER_AUTH_URL ?? "");
  const url = URL.parse(testUrl);
  if (app && loopback.has(app.hostname) && url?.protocol === "http:" && loopback.has(url.hostname) &&
    !url.username && !url.password) return { url: url.href, token: "vektor-e2e" };
  return null;
}

export async function sendWhatsAppCode(
  { phoneNumber, code }: { phoneNumber: string; code: string },
  purpose: "verification" | "reset",
) {
  const config = gateway();
  if (!config?.token || !whatsappNumberPattern.test(phoneNumber)) {
    throw APIError.fromStatus("SERVICE_UNAVAILABLE", { message: "Layanan WhatsApp belum tersedia." });
  }
  const action = purpose === "verification" ? "verifikasi akun" : "atur ulang kata sandi";
  const form = new FormData();
  form.set("target", phoneNumber.slice(1));
  form.set("countryCode", "0");
  form.set("message", `Kode VEKTOR untuk ${action}: ${code}. Berlaku ${whatsappOtpExpiry / 60} menit. Jangan bagikan kode ini.`);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: config.token },
      body: form,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    const result: unknown = await response.json();
    if (response.ok && result && typeof result === "object" && "status" in result && result.status === true) return;
  } catch {
    // Keep the provider response, phone number, and OTP out of logs.
  }
  throw APIError.fromStatus("SERVICE_UNAVAILABLE", { message: "Kode WhatsApp belum dapat dikirim. Coba lagi nanti." });
}
