"use client";

import { Popover } from "@base-ui/react/popover";
import { Bell } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/domain";
import { ActionIcon } from "./action-icon";
import { DashboardSkeleton, DashboardState } from "./dashboard-state";
import { useAlerts } from "./use-alerts";
import { tw } from "@/lib/tw";

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const { alerts, issue, subscribed, busy, marking, markAlertRead, togglePushNotifications, retryAlerts } =
    useAlerts();
  const unreadCount = alerts?.filter((alert) => !alert.read).length ?? 0;
  const notificationLabel = unreadCount
    ? `Notifikasi, ${unreadCount} belum dibaca`
    : "Notifikasi";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="dashboard-icon-control dashboard-notification-trigger" aria-label={notificationLabel}>
        <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="dashboard-notification-count" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="dashboard-popover-positioner" align="end" sideOffset={8}>
          <Popover.Popup className="dashboard-theme dashboard-notification-popover">
            <header className="dashboard-notification-heading">
              <div>
                <Popover.Title className="dashboard-notification-title">Notifikasi</Popover.Title>
                <Popover.Description className="dashboard-notification-description">
                  {alerts ? `${unreadCount} belum dibaca` : "Peringatan wilayah Anda"}
                </Popover.Description>
              </div>
            </header>

            <div className="dashboard-notification-scroll" role="region" aria-label="Daftar peringatan">
              {issue && (
                <DashboardState
                  compact
                  kind="error"
                  title="Kotak masuk belum dapat diperbarui"
                  description={issue}
                  action={
                    <button className={tw("secondary")} type="button" onClick={retryAlerts}>
                      Coba lagi
                    </button>
                  }
                />
              )}
              {alerts?.length ? (
                <ul className="dashboard-notification-list">
                  {alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className={`dashboard-notification-item${alert.read ? "" : " dashboard-notification-item--unread"}`}
                    >
                      <div className="dashboard-notification-item-heading">
                        <strong>{alert.title}</strong>
                        <span className={tw(alert.read ? "tag" : "tag tag-verified")}>
                          {alert.read ? "Dibaca" : "Baru"}
                        </span>
                      </div>
                      <p>{alert.body}</p>
                      <div className="dashboard-notification-item-meta">
                        <span>{alert.districtName}</span>
                        <time dateTime={alert.createdAt}>{formatDate(alert.createdAt)} WIB</time>
                        {!alert.read && (
                          <ActionIcon
                            label="Tandai dibaca"
                            icon="check"
                            disabled={Boolean(marking)}
                            onClick={() => void markAlertRead(alert.id)}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : alerts && !issue ? (
                <DashboardState
                  compact
                  title="Belum ada peringatan"
                  description="Peringatan wilayah akan muncul di sini."
                />
              ) : !issue ? (
                <DashboardSkeleton label="Memuat peringatan…" kind="list" rows={3} />
              ) : null}
            </div>

            <footer className="dashboard-notification-footer">
              <div>
                <strong>Notifikasi perangkat</strong>
                <span>
                  {subscribed === undefined
                    ? <DashboardSkeleton label="Memeriksa status notifikasi…" kind="inline" />
                    : subscribed
                      ? "Aktif"
                      : "Nonaktif"}
                </span>
              </div>
              <button
                className={tw("secondary")}
                type="button"
                onClick={() => void togglePushNotifications()}
                disabled={busy || subscribed === undefined}
              >
                {busy ? "Memperbarui…" : subscribed ? "Matikan" : "Aktifkan"}
              </button>
            </footer>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
