"use client";

import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";
import { ArrowLeft, LogIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError, jsonRequest } from "@/lib/client";
import { adminPath, dashboardReturnPath, homePath, officerPath, radarPath } from "@/lib/routes";
import { normalizeWhatsAppNumber, passwordMinimum, whatsappOtpLength } from "@/lib/whatsapp";
import { Brand } from "../_components/brand";
import { FieldLabel } from "../_components/field-label";

const auth = createAuthClient({ plugins: [phoneNumberClient()] });
type Mode = "login" | "signup" | "forgot" | "link";
const titles: Record<Mode, string> = {
  login: "Masuk", signup: "Daftar akun petani", forgot: "Atur ulang kata sandi", link: "Hubungkan WhatsApp",
};
const actions: Record<Mode, string> = {
  login: "Masuk", signup: "Buat akun", forgot: "Simpan kata sandi baru", link: "Hubungkan WhatsApp",
};

function authError(status: number, fallback: string) {
  if (status === 429) return "Tunggu sebentar sebelum mencoba lagi.";
  if (status === 503) return "Layanan WhatsApp atau akun sedang tidak tersedia. Coba lagi nanti.";
  return fallback;
}

export function AuthForm() {
  const params = useSearchParams();
  const destination = dashboardReturnPath(params.get("next"));
  const [mode, setMode] = useState<Mode>(params.get("mode") === "link" ? "link" : "login");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(params.get("notice") === "account-unavailable"
    ? "Layanan akun sedang tidak tersedia. Coba masuk lagi saat layanan pulih." : "");
  const [busy, setBusy] = useState(false);
  const verifying = mode !== "login" && codeSent;

  function change(next: Mode) {
    setMode(next);
    setCodeSent(false);
    setError("");
    setMessage("");
  }

  async function sendCode(number: string) {
    const result = mode === "forgot" ? await auth.phoneNumber.requestPasswordReset({ phoneNumber: number })
      : await auth.phoneNumber.sendOtp({ phoneNumber: number });
    if (result.error) {
      setError(authError(result.error.status, "Kode WhatsApp belum dapat dikirim. Coba lagi."));
      return;
    }
    setPhone(number);
    setCodeSent(true);
    setMessage(mode === "forgot"
      ? "Jika nomor terhubung ke akun, kode pemulihan akan dikirim melalui WhatsApp."
      : "Kode verifikasi dikirim melalui WhatsApp.");
  }

  async function signIn(login: string, password: string) {
    const number = normalizeWhatsAppNumber(login);
    if (!number && !login.includes("@")) {
      setError("Masukkan nomor WhatsApp yang valid atau email akun Anda.");
      return false;
    }
    const result = number ? await auth.signIn.phoneNumber({ phoneNumber: number, password })
      : await auth.signIn.email({ email: login, password });
    if (result.error) {
      setError(authError(result.error.status, "Identitas akun atau kata sandi belum dapat digunakan untuk masuk."));
      return false;
    }
    const user = result.data?.user;
    const role = user && "role" in user ? user.role : null;
    const start = role === "admin" ? adminPath : role === "officer" ? officerPath : radarPath;
    window.location.replace(destination ?? start);
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
          if (!await signIn(phone, password)) {
            change("login");
            setIdentifier(phone);
            setMessage("Akun berhasil terverifikasi. Silakan masuk.");
          }
        }
      }
    } catch (failure) {
      setError(failure instanceof ApiError ? authError(failure.status, failure.message) : "Koneksi terganggu. Coba lagi.");
    } finally { setBusy(false); }
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try { await sendCode(phone); }
    catch { setError("Koneksi terganggu. Coba lagi."); }
    finally { setBusy(false); }
  }

  const passwordLabel = mode === "forgot" ? "Kata sandi baru" : mode === "link" ? "Kata sandi saat ini" : "Kata sandi";
  const isNewPassword = mode === "forgot" || mode === "signup";
  return <main className="auth-layout">
    <Brand />
    <div className="panel auth-card">
      <Link href={mode === "link" ? destination ?? radarPath : homePath} className="text-link small">
        <ArrowLeft size={16} /> {mode === "link" ? "Kembali ke dasbor" : "Kembali ke beranda"}
      </Link>
      <h1>{titles[mode]}</h1>
      {verifying && <p className="muted">Masukkan kode untuk {phone}.</p>}
      <form className="field-form embedded" onSubmit={submit} key={`${mode}-${codeSent}`}>
        {mode === "login" && <label><FieldLabel required>Nomor WhatsApp atau email</FieldLabel>
          <input name="identifier" placeholder="Contoh: 081234567890" required autoComplete="username" maxLength={254}
            value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
        </label>}
        {mode !== "login" && !verifying && <label><FieldLabel required>Nomor WhatsApp</FieldLabel>
          <input name="phone" type="tel" placeholder="Contoh: 081234567890" required autoComplete="tel" maxLength={30}
            value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>}
        {verifying && <label><FieldLabel required>Kode WhatsApp</FieldLabel>
          <input name="code" placeholder="Contoh: 123456" required inputMode="numeric" autoComplete="one-time-code"
            pattern={`[0-9]{${whatsappOtpLength}}`} maxLength={whatsappOtpLength} />
        </label>}
        {mode === "signup" && verifying && <label><FieldLabel required>Nama</FieldLabel>
          <input name="name" placeholder="Contoh: Dewi Lestari" required maxLength={100} autoComplete="name" />
        </label>}
        {(mode === "login" || verifying) && <label><FieldLabel required>{passwordLabel}</FieldLabel>
          <input name="password" type="password" placeholder={isNewPassword ? `Minimal ${passwordMinimum} karakter` : "Masukkan kata sandi"}
            required minLength={isNewPassword ? passwordMinimum : 1} maxLength={128}
            autoComplete={isNewPassword ? "new-password" : "current-password"} />
        </label>}
        {error && <p className="error-text" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button className="primary" disabled={busy}><LogIn size={17} />
          {busy ? "Memproses…" : mode === "login" || verifying ? actions[mode] : "Kirim kode WhatsApp"}
        </button>
      </form>
      <div className="button-row">
        {verifying && <>
          <button className="text-link" disabled={busy} onClick={() => void resend()}>Kirim ulang kode</button>
          <button className="text-link" disabled={busy} onClick={() => change(mode)}>Ubah nomor</button>
        </>}
        {mode === "login" ? <>
          <button className="text-link" disabled={busy} onClick={() => change("signup")}>Daftar akun petani</button>
          <button className="text-link" disabled={busy} onClick={() => change("forgot")}>Lupa kata sandi</button>
        </> : mode !== "link" && <button className="text-link" disabled={busy} onClick={() => change("login")}>Kembali ke masuk</button>}
      </div>
    </div>
  </main>;
}
