"use client";

import { useEffect, useState } from "react";
import { ApiError, api, apiData } from "@/lib/client";
import { adminAccountsResponseSchema } from "@/lib/api-contracts";
import { tw } from "@/lib/tw";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
};

export function AccountsPanel({
  initial,
  initialHasMore,
  initialQuery = "",
}: {
  initial: UserRow[];
  initialHasMore: boolean;
  initialQuery?: string;
}) {
  const [accounts, setAccounts] = useState(initial);
  const [query, setQuery] = useState(initialQuery);
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (role) params.set("role", role);
    if (state) params.set("state", state);
    params.set("page", String(page));
    void apiData(`admin/accounts?${params}`, adminAccountsResponseSchema, { signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        setAccounts(value.accounts);
        setHasMore(value.hasMore);
        setError("");
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof ApiError ? cause.message : "Daftar akun belum tersedia.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [query, role, state, page, reloadKey]);

  function reload() {
    setLoading(true);
    setError("");
    setReloadKey((value) => value + 1);
  }

  async function change(id: string, body: unknown) {
    setMessage("");
    setError("");
    try {
      await api(`admin/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMessage("Perubahan akses tersimpan.");
      reload();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Perubahan belum tersimpan.");
    }
  }

  return (
    <section className={tw("admin-panel")}>
      <form
        className={tw("admin-toolbar")}
        onSubmit={(event) => {
          event.preventDefault();
          reload();
        }}
      >
        <label>
          Cari akun <span>(opsional)</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
              setLoading(true);
            }}
            placeholder="Nama, email, atau nomor WhatsApp"
          />
        </label>
        <label>
          Peran <span>(opsional)</span>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(0);
              setLoading(true);
            }}
          >
            <option value="">Semua peran</option>
            <option value="farmer">Petani</option>
            <option value="officer">Petugas PPL</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>
          Status <span>(opsional)</span>
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setPage(0);
              setLoading(true);
            }}
          >
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="banned">Dinonaktifkan</option>
          </select>
        </label>
        <button className={tw("secondary")} disabled={loading}>
          {loading ? "Memuat…" : "Terapkan"}
        </button>
      </form>
      {(message || error) && (
        <p className={tw(`admin-feedback ${error ? "error" : ""}`)} role={error ? "alert" : "status"}>
          {error || message}
        </p>
      )}
      <div className={tw("admin-table-wrap")}>
        <table className={tw("admin-table")}>
          <thead>
            <tr>
              <th>Pengguna</th>
              <th>Peran</th>
              <th>Status</th>
              <th>Kelola akses</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                  {user.phoneNumber && <small>{user.phoneNumber}</small>}
                </td>
                <td>{user.role === "farmer" ? "Petani" : user.role === "officer" ? "Petugas PPL" : "Admin"}</td>
                <td>
                  <span className={tw(`admin-badge ${user.banned ? "bad" : ""}`)}>
                    {user.banned ? "Dinonaktifkan" : "Aktif"}
                  </span>
                  {user.banned && user.banReason && <small>Alasan: {user.banReason}</small>}
                </td>
                <td>
                  {user.role === "admin" ? (
                    <span className={tw("admin-help")}>Akses Admin dikelola langsung di database.</span>
                  ) : (
                    <div className={tw("admin-form")}>
                      <label>
                        Peran baru <span className={tw("admin-required")}>*</span>
                        <select
                          required
                          value={user.role}
                          onChange={(event) => void change(user.id, { action: "role", role: event.target.value })}
                        >
                          <option value="farmer">Petani</option>
                          <option value="officer">Petugas PPL</option>
                        </select>
                      </label>
                      {user.banned ? (
                        <button className={tw("secondary")} onClick={() => void change(user.id, { action: "unban" })}>
                          Aktifkan akun
                        </button>
                      ) : (
                        <details>
                          <summary className={tw("text-link")}>Nonaktifkan akun</summary>
                          <form
                            className={tw("admin-form")}
                            onSubmit={(event) => {
                              event.preventDefault();
                              const data = new FormData(event.currentTarget);
                              void change(user.id, { action: "ban", reason: data.get("reason") });
                            }}
                          >
                            <label>
                              Alasan <span className={tw("admin-required")}>*</span>
                              <input
                                name="reason"
                                required
                                minLength={3}
                                maxLength={200}
                                placeholder="Jelaskan alasan penonaktifan"
                              />
                            </label>
                            <button className={tw("danger")}>Nonaktifkan</button>
                          </form>
                        </details>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!accounts.length && (
              <tr>
                <td colSpan={4}>{loading ? "Memuat akun…" : "Tidak ada akun yang cocok."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={tw("admin-toolbar")}>
        <span className={tw("admin-help")}>Halaman {page + 1}</span>
        <div className={tw("button-row action-row")}>
          <button
            className={tw("secondary")}
            disabled={!page || loading}
            onClick={() => {
              setLoading(true);
              setPage((value) => value - 1);
            }}
          >
            Sebelumnya
          </button>
          <button
            className={tw("secondary")}
            disabled={!hasMore || loading}
            onClick={() => {
              setLoading(true);
              setPage((value) => value + 1);
            }}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </section>
  );
}
