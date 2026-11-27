"use client";

import { useState } from "react";
import { StaffHistoryEntries, type HistoryEntriesProps } from "./staff-history-entries";
import { tw } from "@/lib/tw";

export function StaffHistory<T>({ title, ...props }: HistoryEntriesProps<T> & { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details className={tw("staff-history")} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{title}</summary>
      {open && <StaffHistoryEntries {...props} />}
    </details>
  );
}
