"use client";

import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { homePath, radarPath } from "@/lib/routes";
import { passwordMinimum, whatsappOtpLength } from "@/lib/whatsapp";
import { Brand } from "../_components/brand";
import { FieldLabel } from "../_components/field-label";
import { PasswordInput } from "../_components/password-input";
import { useAuthFlow, type AuthMode } from "./use-auth-flow";
import { tw } from "@/lib/tw";

const titles: Record<AuthMode, string> = {
  login: "Masuk",
  signup: "Daftar akun petani",
  forgot: "Atur ulang kata sandi",
  link: "Hubungkan WhatsApp",
};
const actions: Record<AuthMode, string> = {
  login: "Masuk",
  signup: "Buat akun",
  forgot: "Simpan kata sandi baru",
  link: "Hubungkan WhatsApp",
};

export function AuthForm() {
  const params = useSearchParams();
  const {
    destination,
    mode,
    phone,
    setPhone,
    identifier,
    setIdentifier,
    codeSent,
    message,
    error,
    busy,
    verifying,
    change,
    submit,
    resend,
  } = useAuthFlow({
    nextPath: params.get("next"),
    initialMode: params.get("mode") === "link" ? "link" : "login",
    initialError:
      params.get("notice") === "account-unavailable"
        ? "Layanan akun sedang tidak tersedia. Coba masuk lagi saat layanan pulih."
        : "",
  });
  const passwordLabel = mode === "forgot" ? "Kata sandi baru" : mode === "link" ? "Kata sandi saat ini" : "Kata sandi";
  const isNewPassword = mode === "forgot" || mode === "signup";
  return (
    <main className={tw("auth-layout")}>
      <Brand />
      <div className={tw("panel auth-card")}>
        <Link href={mode === "link" ? (destination ?? radarPath) : homePath} className={tw("text-link small")}>
          <ArrowLeft size={16} /> {mode === "link" ? "Kembali ke dasbor" : "Kembali ke beranda"}
        </Link>
        <h1>{titles[mode]}</h1>
        {verifying && <p className={tw("muted")}>Masukkan kode untuk {phone}.</p>}
        <form className={tw("field-form embedded")} onSubmit={submit} key={`${mode}-${codeSent}`}>
          {mode === "login" && (
            <label>
              <FieldLabel required>Nomor WhatsApp atau email</FieldLabel>
              <input
                name="identifier"
                placeholder="Contoh: 081234567890"
                required
                autoComplete="username"
                maxLength={254}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </label>
          )}
          {mode !== "login" && !verifying && (
            <label>
              <FieldLabel required>Nomor WhatsApp</FieldLabel>
              <input
                name="phone"
                type="tel"
                placeholder="Contoh: 081234567890"
                required
                autoComplete="tel"
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
          )}
          {verifying && (
            <label>
              <FieldLabel required>Kode WhatsApp</FieldLabel>
              <input
                name="code"
                placeholder="Contoh: 123456"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern={`[0-9]{${whatsappOtpLength}}`}
                maxLength={whatsappOtpLength}
              />
            </label>
          )}
          {mode === "signup" && verifying && (
            <label>
              <FieldLabel required>Nama</FieldLabel>
              <input name="name" placeholder="Contoh: Dewi Lestari" required maxLength={100} autoComplete="name" />
            </label>
          )}
          {(mode === "login" || verifying) && (
            <div className={tw("auth-password-field")}>
              <label htmlFor="auth-password">
                <FieldLabel required>{passwordLabel}</FieldLabel>
              </label>
              <PasswordInput
                id="auth-password"
                name="password"
                className={tw("auth-password-input")}
                containerClassName="auth-password-control"
                placeholder={isNewPassword ? `Minimal ${passwordMinimum} karakter` : "Masukkan kata sandi"}
                required
                minLength={isNewPassword ? passwordMinimum : 1}
                maxLength={128}
                autoComplete={isNewPassword ? "new-password" : "current-password"}
              />
            </div>
          )}
          {error && (
            <p className={tw("error-text")} role="alert">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <button className={tw("primary")} disabled={busy}>
            <LogIn size={17} />
            {busy ? "Memproses…" : mode === "login" || verifying ? actions[mode] : "Kirim kode WhatsApp"}
          </button>
        </form>
        <div className={tw("button-row action-row")}>
          {verifying && (
            <>
              <button className={tw("text-link")} disabled={busy} onClick={() => void resend()}>
                Kirim ulang kode
              </button>
              <button className={tw("text-link")} disabled={busy} onClick={() => change(mode)}>
                Ubah nomor
              </button>
            </>
          )}
          {mode === "login" ? (
            <>
              <button className={tw("text-link")} disabled={busy} onClick={() => change("signup")}>
                Daftar akun petani
              </button>
              <button className={tw("text-link")} disabled={busy} onClick={() => change("forgot")}>
                Lupa kata sandi
              </button>
            </>
          ) : (
            mode !== "link" && (
              <button className={tw("text-link")} disabled={busy} onClick={() => change("login")}>
                Kembali ke masuk
              </button>
            )
          )}
        </div>
      </div>
    </main>
  );
}
