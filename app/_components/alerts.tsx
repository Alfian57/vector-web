"use client";

import { Bell } from "lucide-react";
import { formatDate } from "@/lib/domain";
import { useAlerts } from "./use-alerts";
import { tw } from "@/lib/tw";

export function Alerts() {
  const { alerts, issue, message, subscribed, busy, markAlertRead, togglePushNotifications } = useAlerts();

  return (
    <section className={tw("panel")}>
      <div className={tw("panel-heading")}>
        <div>
          <h2>Kotak masuk peringatan</h2>
          <p>Pembaruan dari klaster teramati dan petugas PPL.</p>
        </div>
        <button
          className={tw("secondary")}
          onClick={() => void togglePushNotifications()}
          disabled={busy || subscribed === undefined}
        >
          <Bell size={16} /> {subscribed ? "Matikan notifikasi" : "Aktifkan notifikasi"}
        </button>
      </div>
      {message && (
        <p className={tw("panel-note")} role="status">
          {message}
        </p>
      )}
      {issue && (
        <p className={tw("panel-note error-text")} role="alert">
          {issue}
        </p>
      )}
      {alerts?.length ? (
        <ul className={tw("list")}>
          {alerts.map((alert) => (
            <li key={alert.id}>
              <div>
                <strong>{alert.title}</strong>
                <p>
                  {alert.districtName} · {formatDate(alert.createdAt)} WIB
                </p>
                <p>{alert.body}</p>
              </div>
              {alert.read ? (
                <span className={tw("tag")}>Dibaca</span>
              ) : (
                <button className={tw("secondary")} onClick={() => void markAlertRead(alert.id)}>
                  Tandai dibaca
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={tw("empty")}>
          {alerts
            ? "Belum ada peringatan untuk petak Anda."
            : issue
              ? "Kotak masuk belum tersedia."
              : "Memuat peringatan…"}
        </p>
      )}
    </section>
  );
}
