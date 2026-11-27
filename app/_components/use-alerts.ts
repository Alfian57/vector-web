"use client";

import { useEffect, useState } from "react";
import { api, apiData, errorMessage, jsonRequest } from "@/lib/client";
import { alertSchema, pushKeySchema, subscriptionStatusSchema } from "@/lib/api-contracts";
import type { Alert } from "@/lib/domain";

const alertsSchema = alertSchema.array();

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>();
  const [issue, setIssue] = useState("");
  const [message, setMessage] = useState("");
  const [subscribed, setSubscribed] = useState<boolean>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void apiData("alerts", alertsSchema, { signal })
      .then(setAlerts)
      .catch((error) => {
        if (!signal.aborted) setIssue(errorMessage(error));
      });

    async function checkSubscription() {
      const registration = await navigator.serviceWorker?.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) return false;
      const result = await apiData("push/status", subscriptionStatusSchema, {
        ...jsonRequest("POST", { endpoint: subscription.endpoint }),
        signal,
      });
      return result.subscribed;
    }

    void checkSubscription()
      .catch(() => false)
      .then((value) => {
        if (!signal.aborted) setSubscribed(value);
      });
    return () => controller.abort();
  }, []);

  async function markAlertRead(id: string) {
    try {
      await api(`alerts/${id}`, jsonRequest("PATCH"));
      setAlerts((items) => items?.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch (error) {
      setIssue(errorMessage(error));
    }
  }

  async function togglePushNotifications() {
    if (!("PushManager" in window) || !("Notification" in window) || !navigator.serviceWorker) {
      setMessage("Perangkat ini belum mendukung Web Push. Di iPhone, buka VEKTOR dari Layar Utama.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (!subscribed && (await Notification.requestPermission()) !== "granted") {
        setMessage("Izin notifikasi belum diberikan. Peringatan tetap tersedia di kotak masuk.");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) {
        setMessage("Muat ulang aplikasi untuk mengaktifkan notifikasi.");
        return;
      }
      const existing = await registration.pushManager.getSubscription();
      if (subscribed && existing) {
        await api("push", jsonRequest("DELETE", { endpoint: existing.endpoint }));
        setSubscribed(false);
        await existing.unsubscribe().catch(() => {});
        setMessage("Notifikasi perangkat dinonaktifkan.");
        return;
      }
      const { key } = await apiData("push-key", pushKeySchema);
      if (!key) {
        setMessage("Notifikasi perangkat belum dikonfigurasi.");
        return;
      }
      const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
      const serverKey = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey }));
      await api("push", jsonRequest("POST", subscription.toJSON()));
      setSubscribed(true);
      setMessage("Notifikasi perangkat diaktifkan.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return { alerts, issue, message, subscribed, busy, markAlertRead, togglePushNotifications };
}
