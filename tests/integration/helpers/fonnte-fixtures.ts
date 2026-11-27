import type { FonnteMode } from "./fonnte-control";
import { fonnteControlUrl } from "./test-environment";

export async function setFonnteMode(mode: FonnteMode) {
  const response = await fetch(`${fonnteControlUrl()}/__test/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!response.ok) throw new Error(`Failed to set Fonnte mode: ${response.status}`);
}

export async function resetFonnteStub() {
  const response = await fetch(`${fonnteControlUrl()}/__test/reset`, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to reset Fonnte stub: ${response.status}`);
}

export async function getCapturedOtp(
  phoneNumber: string,
  purpose: "verifikasi akun" | "atur ulang kata sandi" = "verifikasi akun",
) {
  const target = phoneNumber.startsWith("+") ? phoneNumber.slice(1) : phoneNumber;
  const url = new URL("/messages", fonnteControlUrl());
  url.searchParams.set("target", target);
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const response = await fetch(url);
    const data = (await response.json()) as { message: string | null };
    const code = data.message?.match(new RegExp(`${purpose}: (\\d{6})`))?.[1];
    if (code) return code;
    await Bun.sleep(40);
  }
  throw new Error(`Timed out waiting for OTP (${purpose}) for ${target}`);
}
