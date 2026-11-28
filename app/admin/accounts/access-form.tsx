"use client";

import { useState } from "react";
import { FieldLabel } from "@/app/_components/field-label";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { showToast } from "@/app/_components/toast";
import { tw } from "@/lib/tw";
import type { UserRow } from "./types";

type AccountChange =
  { action: "role"; role: "farmer" | "officer" } | { action: "ban"; reason: string } | { action: "unban" };

export function AccountAccessForm({ user, onUpdated }: { user: UserRow; onUpdated: (user: UserRow) => void }) {
  const [access, setAccess] = useState({ role: user.role, banned: user.banned, reason: user.banReason });
  const [nextRole, setNextRole] = useState(user.role);
  const [reason, setReason] = useState("");
  const [confirmBan, setConfirmBan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");

  async function save(change: AccountChange) {
    if (busy) return;
    setBusy(true);
    setIssue("");
    try {
      await api(`admin/accounts/${encodeURIComponent(user.id)}`, jsonRequest("PATCH", change));
      const updated =
        change.action === "role"
          ? { ...access, role: change.role }
          : { ...access, banned: change.action === "ban", reason: change.action === "ban" ? change.reason : null };
      setAccess(updated);
      onUpdated({
        ...user,
        role: updated.role,
        banned: updated.banned,
        banReason: updated.reason,
      });
      if (change.action !== "role") {
        setReason("");
        setConfirmBan(false);
      }
      showToast("Perubahan akses tersimpan.");
    } catch (error) {
      setIssue(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-admin-access-content">
      <header className="dashboard-admin-access-status">
        <h2>Akses saat ini</h2>
        <span className={tw(`admin-badge ${access.banned ? "bad" : ""}`)}>
          {access.banned ? "Dinonaktifkan" : "Aktif"}
        </span>
      </header>
      {issue && (
        <p className={tw("admin-feedback error")} role="alert">
          {issue}
        </p>
      )}
      {user.role === "admin" ? (
        <div className="dashboard-admin-access-note" role="note">
          <strong>Perubahan akun Admin dibatasi.</strong> Peran dan status akun ini tidak dapat diubah dari halaman ini
          untuk melindungi akses pengelola. Ini pembatasan keamanan, bukan kesalahan sistem. Hubungi administrator
          sistem jika akun perlu diubah.
        </div>
      ) : (
        <div className="dashboard-admin-access-sections">
          <form
            className={tw("admin-form dashboard-admin-access-role-form")}
            onSubmit={(event) => {
              event.preventDefault();
              if (nextRole === "farmer" || nextRole === "officer") void save({ action: "role", role: nextRole });
            }}
          >
            <label>
              <FieldLabel required>Peran baru</FieldLabel>
              <select
                required
                value={nextRole}
                disabled={busy}
                onChange={(event) => setNextRole(event.target.value)}
              >
                <option value="farmer">Petani</option>
                <option value="officer">Petugas PPL</option>
              </select>
            </label>
            <button className={tw("primary")} disabled={busy || nextRole === access.role}>
              Simpan peran
            </button>
          </form>
          {access.banned ? (
            <section className="dashboard-admin-access-ban-section">
              <div className="dashboard-admin-access-ban-copy">
                <h3>Akun dinonaktifkan</h3>
                {access.reason && <p>Alasan: {access.reason}</p>}
              </div>
              <button
                type="button"
                className={tw("secondary")}
                disabled={busy}
                onClick={() => void save({ action: "unban" })}
              >
                Aktifkan akun
              </button>
            </section>
          ) : (
            <form
              className={tw("admin-form dashboard-admin-access-ban-form")}
              onSubmit={(event) => {
                event.preventDefault();
                setConfirmBan(true);
              }}
            >
              <div className="dashboard-admin-access-ban-copy">
                <h3>Nonaktifkan akun</h3>
                <p>Penonaktifan akan mengakhiri sesi aktif pengguna.</p>
              </div>
              <label>
                <FieldLabel required>Alasan</FieldLabel>
                <input
                  value={reason}
                  disabled={busy || confirmBan}
                  required
                  minLength={3}
                  maxLength={200}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Jelaskan alasan penonaktifan"
                />
              </label>
              {confirmBan ? (
                <div className="dashboard-admin-access-actions" role="group" aria-label="Konfirmasi penonaktifan akun">
                  <button
                    type="button"
                    className={tw("secondary")}
                    disabled={busy}
                    onClick={() => setConfirmBan(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className={tw("danger")}
                    disabled={busy}
                    onClick={() => void save({ action: "ban", reason: reason.trim() })}
                  >
                    Konfirmasi penonaktifan
                  </button>
                </div>
              ) : (
                <button className={tw("danger")} disabled={busy || reason.trim().length < 3}>
                  Nonaktifkan
                </button>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
