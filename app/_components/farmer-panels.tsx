"use client";

import { Bell, MapPin, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage, jsonRequest } from "@/lib/client";
import { formatDate, type Alert, type MapPackage, type Plot } from "@/lib/domain";
import type { OfflineMap } from "@/lib/pwa/storage";
import { FieldLabel } from "./field-label";
import { LocationFields, type Coordinates } from "./location-fields";

const blank: Coordinates = { longitude: "", latitude: "" };

export function Plots({ tiles, offlineMap }: { tiles?: MapPackage; offlineMap?: OfflineMap }) {
  const [plots, setPlots] = useState<Plot[]>();
  const [coordinates, setCoordinates] = useState<Coordinates>(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Plot>();
  const [adding, setAdding] = useState(false);
  function load() { return api<Plot[]>("plots").then(setPlots).catch((error) => setMessage(errorMessage(error))); }
  useEffect(() => { void load(); }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await api("plots", jsonRequest("POST", {
        name: form.get("name"), longitude: Number(coordinates.longitude), latitude: Number(coordinates.latitude),
      }));
      setAdding(false);
      setCoordinates(blank);
      await load();
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`plots/${selected.id}`, { method: "DELETE" });
      setSelected(undefined);
      await load();
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <section className="panel">
    <div className="panel-heading"><div><h2>Petak pantauan</h2><p>Terima peringatan untuk kecamatan tempat petak terdaftar.</p></div>
      <button className="secondary" onClick={() => setAdding(!adding)} aria-expanded={adding}><Plus size={17} /> {adding ? "Tutup form" : "Tambah petak"}</button></div>
    {message && <p className="panel-note error-text" role="alert">{message}</p>}
    {adding && <form className="field-form embedded" onSubmit={add}>
      <label><FieldLabel required>Nama petak</FieldLabel><input name="name" required maxLength={80} placeholder="Contoh: Petak utara" /></label>
      <LocationFields value={coordinates} onChange={setCoordinates} tiles={tiles} offlineMap={offlineMap} />
      <button className="primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan petak"}</button>
    </form>}
    {plots?.length ? <ul className="list">{plots.map((plot) => <li key={plot.id}>
      <div><strong>{plot.name}</strong><p><MapPin size={14} /> {plot.districtName}</p></div>
      <button className="icon-button" aria-label={`Hapus ${plot.name}`} onClick={() => setSelected(plot)}><Trash2 size={17} /></button>
    </li>)}</ul> : <p className="empty">{plots ? "Belum ada petak pantauan." : message ? "Daftar petak belum tersedia." : "Memuat petak…"}</p>}
    {selected && <div className="panel-note" role="group" aria-label="Konfirmasi penghapusan">
      <p>Hapus {selected.name} dari pantauan? Peringatan baru tidak akan dikirim untuk petak ini.</p>
      <div className="button-row"><button className="secondary" onClick={() => setSelected(undefined)}>Batal</button>
        <button className="danger" onClick={() => void remove()} disabled={busy}>Hapus petak</button></div>
    </div>}
  </section>;
}

export function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>();
  const [issue, setIssue] = useState("");
  const [message, setMessage] = useState("");
  const [subscribed, setSubscribed] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void api<Alert[]>("alerts", { signal }).then(setAlerts).catch((error) => {
      if (!signal.aborted) setIssue(errorMessage(error));
    });
    async function checkSubscription() {
      const registration = await navigator.serviceWorker?.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) return false;
      const result = await api<{ subscribed: boolean }>("push/status", {
        ...jsonRequest("POST", { endpoint: subscription.endpoint }), signal,
      });
      return result.subscribed;
    }
    void checkSubscription().catch(() => false).then((value) => {
      if (!signal.aborted) setSubscribed(value);
    });
    return () => controller.abort();
  }, []);

  async function mark(id: string) {
    try {
      await api(`alerts/${id}`, jsonRequest("PATCH"));
      setAlerts((items) => items?.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (error) { setIssue(errorMessage(error)); }
  }

  async function notifications() {
    if (!("PushManager" in window) || !("Notification" in window) || !navigator.serviceWorker) {
      setMessage("Perangkat ini belum mendukung Web Push. Di iPhone, buka VEKTOR dari Layar Utama.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (!subscribed && await Notification.requestPermission() !== "granted") {
        setMessage("Izin notifikasi belum diberikan. Peringatan tetap tersedia di kotak masuk.");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) { setMessage("Muat ulang aplikasi untuk mengaktifkan notifikasi."); return; }
      const existing = await registration.pushManager.getSubscription();
      if (subscribed && existing) {
        await api("push", jsonRequest("DELETE", { endpoint: existing.endpoint }));
        setSubscribed(false);
        await existing.unsubscribe().catch(() => {});
        setMessage("Notifikasi perangkat dinonaktifkan.");
        return;
      }
      const { key } = await api<{ key: string | null }>("push-key");
      if (!key) { setMessage("Notifikasi perangkat belum dikonfigurasi."); return; }
      const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
      const serverKey = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
      await api("push", jsonRequest("POST", subscription.toJSON()));
      setSubscribed(true);
      setMessage("Notifikasi perangkat diaktifkan.");
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <section className="panel">
    <div className="panel-heading"><div><h2>Kotak masuk peringatan</h2><p>Pembaruan dari klaster teramati dan petugas PPL.</p></div>
      <button className="secondary" onClick={() => void notifications()} disabled={busy || subscribed === undefined}>
        <Bell size={16} /> {subscribed ? "Matikan notifikasi" : "Aktifkan notifikasi"}</button></div>
    {message && <p className="panel-note" role="status">{message}</p>}
    {issue && <p className="panel-note error-text" role="alert">{issue}</p>}
    {alerts?.length ? <ul className="list">{alerts.map((alert) => <li key={alert.id}>
      <div><strong>{alert.title}</strong><p>{alert.districtName} · {formatDate(alert.createdAt)} WIB</p><p>{alert.body}</p></div>
      {alert.read ? <span className="tag">Dibaca</span> : <button className="secondary" onClick={() => void mark(alert.id)}>Tandai dibaca</button>}
    </li>)}</ul> : <p className="empty">{alerts ? "Belum ada peringatan untuk petak Anda." : issue ? "Kotak masuk belum tersedia." : "Memuat peringatan…"}</p>}
  </section>;
}
