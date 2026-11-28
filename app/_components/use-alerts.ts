"use client";

import { useEffect, useState } from "react";
import { api, apiData, errorMessage, jsonRequest } from "@/lib/client";
import { alertSchema, pushKeySchema, subscriptionStatusSchema } from "@/lib/api-contracts";
import type { Alert } from "@/lib/domain";
import { showToast } from "./toast";

const alertsSchema = alertSchema.array();

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>();
  const [issue, setIssue] = useState("");
  const [subscribed, setSubscribed] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [marking, setMarking] = useState<string>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void apiData("alerts", alertsSchema, { signal })
      .then((items) => {
        if (!signal.aborted) {
          setAlerts(items);
          setIssue("");
        }
      })
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
  }, [reload]);

  async function markAlertRead(id: string) {
    if (marking) return;
    setMarking(id);
    setIssue("");
    try {
      await api(`alerts/${id}`, jsonRequest("PATCH"));
      setAlerts((items) => items?.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch (error) {
      setIssue(errorMessage(error));
    } finally {
      setMarking(undefined);
    }
  }

  async function togglePushNotifications() {
    if (busy) return;
    if (!("PushManager" in window) || !("Notification" in window) || !navigator.serviceWorker) {
      showToast("Perangkat ini belum mendukung Web Push. Di iPhone, buka VEKTOR dari Layar Utama.", "warning");
      return;
    }
    setBusy(true);
    try {
      if (!subscribed && (await Notification.requestPermission()) !== "granted") {
        showToast("Izin notifikasi belum diberikan. Peringatan tetap tersedia di kotak masuk.", "warning");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) {
        showToast("Muat ulang aplikasi untuk mengaktifkan notifikasi.", "info");
        return;
      }
      const existing = await registration.pushManager.getSubscription();
      if (subscribed && existing) {
        await api("push", jsonRequest("DELETE", { endpoint: existing.endpoint }));
        setSubscribed(false);
        await existing.unsubscribe().catch(() => {});
        showToast("Notifikasi perangkat dinonaktifkan.");
        return;
      }
      const { key } = await apiData("push-key", pushKeySchema);
      if (!key) {
        showToast("Notifikasi perangkat belum dikonfigurasi.", "warning");
        return;
      }
      const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
      const serverKey = Uint8Array.from(atob(base64), (value) => value.charCodeAt(0));
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey }));
      await api("push", jsonRequest("POST", subscription.toJSON()));
      setSubscribed(true);
      showToast("Notifikasi perangkat diaktifkan.");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return {
    alerts,
    issue,
    subscribed,
    busy,
    marking,
    markAlertRead,
    togglePushNotifications,
    retryAlerts: () => {
      setIssue("");
      setReload((value) => value + 1);
    },
  };
}
