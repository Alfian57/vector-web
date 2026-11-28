"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";

export function DashboardSearchDialog({
  title,
  triggerLabel = "Cari menu dan fitur",
  query,
  open,
  onOpenChange,
  onQueryChange,
  children,
}: {
  title: string;
  triggerLabel?: string;
  query: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const openFromKeyboard = useEffectEvent(() => {
    if (open) input.current?.focus();
    else onOpenChange(true);
  });

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openFromKeyboard();
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger
        ref={trigger}
        className="dashboard-search-trigger"
        aria-label={triggerLabel}
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
        <span>Cari menu atau data…</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="dashboard-backdrop" />
        <Dialog.Viewport className="dashboard-dialog-viewport">
          <Dialog.Popup
            className="dashboard-theme dashboard-dialog dashboard-search-dialog"
            initialFocus={input}
            finalFocus={trigger}
          >
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            <div className="dashboard-search-field">
              <Search size={20} strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                ref={input}
                aria-label="Cari menu atau data yang dapat diakses"
                placeholder="Cari menu atau data…"
                value={query}
                onChange={(event) => onQueryChange(event.currentTarget.value)}
              />
              <Dialog.Close className="dashboard-icon-control" aria-label="Tutup pencarian">
                <X size={19} />
              </Dialog.Close>
            </div>
            <div className="dashboard-search-results">{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DashboardSearchGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dashboard-search-group" aria-label={title}>
      <h2>{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}
