"use client";

import { Toast } from "@base-ui/react/toast";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

type ToastData = { tone: ToastTone };

const toastManager = Toast.createToastManager<ToastData>();

export function showToast(message: string, tone: ToastTone = "success") {
  toastManager.add({
    title: message,
    type: tone,
    data: { tone },
    priority: tone === "error" ? "high" : "low",
    timeout: tone === "error" ? 7000 : 5000,
  });
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={4}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="dashboard-theme dashboard-toast-viewport" aria-label="Notifikasi">
          <ToastItems />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastItems() {
  const { toasts } = Toast.useToastManager<ToastData>();

  return toasts.map((toast) => {
    const tone = toast.data?.tone ?? "success";
    const Icon =
      tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : tone === "warning" ? TriangleAlert : Info;

    return (
      <Toast.Root key={toast.id} toast={toast} className={`dashboard-toast dashboard-toast--${tone}`}>
        <Toast.Content className="dashboard-toast-content">
          <Icon className="dashboard-toast-icon" size={19} aria-hidden="true" />
          <Toast.Title className="dashboard-toast-title" />
          <Toast.Close className="dashboard-toast-close" aria-label="Tutup notifikasi">
            <X size={17} aria-hidden="true" />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}
