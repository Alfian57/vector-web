"use client";

import { useEffect, useState } from "react";
import type { ActivityLog } from "@/lib/domain";
import { ApiError, apiData } from "@/lib/client";
import { activityLogSchema, pageSchema } from "@/lib/api-contracts";
import { tw } from "@/lib/tw";

export function LogsPanel({ initial, initialQuery = "" }: { initial: ActivityLog[]; initialQuery?: string }) {
  const [logs, setLogs] = useState(initial);
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [issue, setIssue] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    if (kind) params.set("kind", kind);
    if (category) params.set("category", category);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    void apiData(`admin/logs?${params}`, pageSchema(activityLogSchema), { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setLogs(result.entries);
        setHasMore(result.hasMore);
        setIssue("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setIssue(error instanceof ApiError ? error.message : "Log belum tersedia.");
      });
    return () => controller.abort();
  }, [page, query, kind, category, from, to]);

  return (
    <section className={tw("admin-panel")}>
      <form
        className={tw("admin-toolbar")}
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
        }}
      >
        <label>
          Cari log <span>(opsional)</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Aksi, kategori, atau ringkasan"
          />
        </label>
        <label>
          Jenis <span>(opsional)</span>
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Semua jenis</option>
            <option value="audit">Aktivitas pengguna</option>
            <option value="system">Status sistem</option>
          </select>
        </label>
        <label>
          Kategori <span>(opsional)</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Semua kategori</option>
            <option value="account">Akun</option>
            <option value="education">Edukasi</option>
            <option value="page">Halaman</option>
            <option value="worker">Worker</option>
            <option value="auth">Autentikasi</option>
            <option value="api">API</option>
          </select>
        </label>
        <label>
          Dari tanggal <span>(opsional)</span>
          <input
            type="date"
            placeholder="Pilih tanggal mulai"
            aria-label="Dari tanggal (opsional)"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Sampai tanggal <span>(opsional)</span>
          <input
            type="date"
            placeholder="Pilih tanggal akhir"
            aria-label="Sampai tanggal (opsional)"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <button className={tw("secondary")}>Terapkan</button>
      </form>
      {issue && (
        <p className={tw("admin-feedback error")} role="alert">
          {issue}
        </p>
      )}
      <div className={tw("admin-table-wrap")}>
        <table className={tw("admin-table")}>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Pelaku</th>
              <th>Aksi</th>
              <th>Ringkasan</th>
              <th>Hasil</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(log.createdAt),
                  )}
                </td>
                <td>
                  {log.actorName ?? "Sistem"}
                  <small>{log.actorRole ?? log.category}</small>
                </td>
                <td className={tw("admin-log-action")}>{log.action}</td>
                <td>{log.summary}</td>
                <td>
                  <span
                    className={tw(`admin-badge ${log.outcome === "failure" || log.severity === "error" ? "bad" : ""}`)}
                  >
                    {log.outcome === "success" ? "Berhasil" : "Gagal"}
                  </span>
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td colSpan={5}>Belum ada aktivitas pada filter ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={tw("admin-toolbar")}>
        <span className={tw("admin-help")}>Halaman {page + 1}</span>
        <div className={tw("button-row action-row")}>
          <button className={tw("secondary")} disabled={!page} onClick={() => setPage((value) => value - 1)}>
            Sebelumnya
          </button>
          <button className={tw("secondary")} disabled={!hasMore} onClick={() => setPage((value) => value + 1)}>
            Berikutnya
          </button>
        </div>
      </div>
    </section>
  );
}
