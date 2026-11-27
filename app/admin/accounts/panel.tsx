"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client";

type UserRow = { id: string; name: string; email: string; phoneNumber: string | null; role: string; banned: boolean; banReason: string | null; createdAt: string };

export function AccountsPanel({ initial, initialHasMore }: { initial: UserRow[]; initialHasMore: boolean }) {
  const [accounts, setAccounts] = useState(initial);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (role) params.set("role", role);
    if (state) params.set("state", state);
    params.set("page", String(page));
    try { const value = await api<{ accounts: UserRow[]; hasMore: boolean }>(`admin/accounts?${params}`); setAccounts(value.accounts); setHasMore(value.hasMore); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Daftar akun belum tersedia."); }
    finally { setLoading(false); }
  }, [query, role, state, page]);

  useEffect(() => { void load(); }, [load]);

  async function change(id: string, body: unknown) {
    setMessage(""); setError("");
    try { await api(`admin/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); setMessage("Perubahan akses tersimpan."); await load(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Perubahan belum tersimpan."); }
  }

  return <section className="admin-panel">
    <form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); void load(); }}>
      <label>Cari akun <span>(opsional)</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Nama, email, atau nomor WhatsApp" /></label>
      <label>Peran <span>(opsional)</span><select value={role} onChange={(event) => { setRole(event.target.value); setPage(0); }}><option value="">Semua peran</option><option value="farmer">Petani</option><option value="officer">Petugas PPL</option><option value="admin">Admin</option></select></label>
      <label>Status <span>(opsional)</span><select value={state} onChange={(event) => { setState(event.target.value); setPage(0); }}><option value="">Semua status</option><option value="active">Aktif</option><option value="banned">Dinonaktifkan</option></select></label>
      <button className="secondary" disabled={loading}>{loading ? "Memuat…" : "Terapkan"}</button>
    </form>
    {(message || error) && <p className={`admin-feedback ${error ? "error" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Kelola akses</th></tr></thead>
      <tbody>{accounts.map((user) => <tr key={user.id}>
        <td><strong>{user.name}</strong><small>{user.email}</small>{user.phoneNumber && <small>{user.phoneNumber}</small>}</td>
        <td>{user.role === "farmer" ? "Petani" : user.role === "officer" ? "Petugas PPL" : "Admin"}</td>
        <td><span className={`admin-badge ${user.banned ? "bad" : ""}`}>{user.banned ? "Dinonaktifkan" : "Aktif"}</span>{user.banned && user.banReason && <small>Alasan: {user.banReason}</small>}</td>
        <td>{user.role === "admin" ? <span className="admin-help">Akses Admin dikelola langsung di database.</span> : <div className="admin-form">
          <label>Peran baru <span className="admin-required">*</span><select required value={user.role} onChange={(event) => void change(user.id, { action: "role", role: event.target.value })}><option value="farmer">Petani</option><option value="officer">Petugas PPL</option></select></label>
          {user.banned ? <button className="secondary" onClick={() => void change(user.id, { action: "unban" })}>Aktifkan akun</button> : <details><summary className="text-link">Nonaktifkan akun</summary><form className="admin-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void change(user.id, { action: "ban", reason: data.get("reason") }); }}>
            <label>Alasan <span className="admin-required">*</span><input name="reason" required minLength={3} maxLength={200} placeholder="Jelaskan alasan penonaktifan" /></label><button className="danger">Nonaktifkan</button>
          </form></details>}
        </div>}</td>
      </tr>)}
      {!accounts.length && <tr><td colSpan={4}>{loading ? "Memuat akun…" : "Tidak ada akun yang cocok."}</td></tr>}</tbody>
    </table></div>
    <div className="admin-toolbar"><button className="secondary" disabled={!page || loading} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button><span className="admin-help">Halaman {page + 1}</span><button className="secondary" disabled={!hasMore || loading} onClick={() => setPage((value) => value + 1)}>Berikutnya</button></div>
  </section>;
}
