"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { signInPath } from "@/lib/routes";

export function AdminSignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try { await api("auth/sign-out", { method: "POST", signal: AbortSignal.timeout(8000) }); window.location.replace(signInPath); }
    catch { setError("Belum dapat keluar. Coba lagi."); setBusy(false); }
  }
  return <div className="admin-logout-wrap"><button className="admin-nav-button" onClick={() => void signOut()} disabled={busy}><LogOut size={18} />{busy ? "Sedang keluar…" : "Keluar"}</button>{error && <span role="alert">{error}</span>}</div>;
}
