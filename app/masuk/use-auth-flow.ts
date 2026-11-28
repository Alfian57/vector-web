"use client";

import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";
import { useState, type FormEvent } from "react";
import { api, ApiError, jsonRequest } from "@/lib/client";
import { adminPath, dashboardReturnPath, officerPath, radarPath } from "@/lib/routes";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

const auth = createAuthClient({ plugins: [phoneNumberClient()] });

export type AuthMode = "login" | "signup" | "forgot" | "link";

function authError(status: number, fallback: string) {
  if (status === 429) return "Tunggu sebentar sebelum mencoba lagi.";
  if (status === 503) return "Layanan WhatsApp atau akun sedang tidak tersedia. Coba lagi nanti.";
  return fallback;
}

export function useAuthFlow({
  nextPath,
  initialMode,
  initialError,
}: {
  nextPath: string | null;
  initialMode: AuthMode;
  initialError: string;
}) {
  const destination = dashboardReturnPath(nextPath);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const verifying = mode !== "login" && codeSent;

  function change(next: AuthMode) {
    setMode(next);
    setCodeSent(false);
    setError("");
    setMessage("");
  }

  async function sendCode(number: string) {
    const result =
      mode === "forgot"
        ? await auth.phoneNumber.requestPasswordReset({ phoneNumber: number })
        : await auth.phoneNumber.sendOtp({ phoneNumber: number });
    if (result.error) {
      setError(authError(result.error.status, "Kode WhatsApp belum dapat dikirim. Coba lagi."));
      return;
    }
    setPhone(number);
    setCodeSent(true);
    setMessage(
      mode === "forgot"
        ? "Jika nomor terhubung ke akun, kode pemulihan akan dikirim melalui WhatsApp."
        : "Kode verifikasi dikirim melalui WhatsApp.",
    );
  }

  async function signIn(login: string, password: string) {
    const number = normalizeWhatsAppNumber(login);
    if (!number && !login.includes("@")) {
      setError("Masukkan nomor WhatsApp yang valid atau email akun Anda.");
      return false;
    }
    const result = number
      ? await auth.signIn.phoneNumber({ phoneNumber: number, password })
      : await auth.signIn.email({ email: login, password });
    if (result.error) {
      setError(authError(result.error.status, "Identitas akun atau kata sandi belum dapat digunakan untuk masuk."));
      return false;
    }
    const user = result.data?.user;
    const role = user && "role" in user ? user.role : null;
    const start = role === "admin" ? adminPath : role === "officer" ? officerPath : radarPath;
    const roleDestination = role === "admin" || role === "officer" || role === "farmer"
      ? dashboardReturnPath(nextPath, role)
      : undefined;
    window.location.replace(roleDestination ?? start);
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    try {
      if (mode === "login") {
        await signIn(identifier.trim(), password);
      } else if (!codeSent) {
        const number = normalizeWhatsAppNumber(phone);
        if (!number) setError("Masukkan nomor WhatsApp yang valid.");
        else await sendCode(number);
      } else {
        const code = String(form.get("code") ?? "").trim();
        if (mode === "forgot") {
          const result = await auth.phoneNumber.resetPassword({ phoneNumber: phone, otp: code, newPassword: password });
          if (result.error) {
            setError(authError(result.error.status, "Kode salah atau kedaluwarsa. Periksa kode atau minta kode baru."));
            return;
          }
          change("login");
          setIdentifier(phone);
          setMessage("Kata sandi diperbarui. Silakan masuk.");
        } else if (mode === "link") {
          await api("auth/whatsapp/link", jsonRequest("POST", { phoneNumber: phone, code, password }));
          window.location.replace(destination ?? radarPath);
        } else {
          const name = String(form.get("name") ?? "").trim();
          await api("auth/whatsapp/register", jsonRequest("POST", { phoneNumber: phone, code, name, password }));
          if (!(await signIn(phone, password))) {
            change("login");
            setIdentifier(phone);
            setMessage("Akun berhasil terverifikasi. Silakan masuk.");
          }
        }
      }
    } catch (failure) {
      setError(
        failure instanceof ApiError ? authError(failure.status, failure.message) : "Koneksi terganggu. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await sendCode(phone);
    } catch {
      setError("Koneksi terganggu. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return {
    destination,
    mode,
    phone,
    setPhone,
    identifier,
    setIdentifier,
    codeSent,
    verifying,
    message,
    error,
    busy,
    change,
    submit,
    resend,
  };
}
