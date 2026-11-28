"use client";

import { StaffHistoryEntries, type HistoryEntriesProps } from "./staff-history-entries";
import { tw } from "@/lib/tw";

export function StaffHistory<T>({
  title,
  className,
  ...props
}: Omit<HistoryEntriesProps<T>, "label"> & { title: string; className?: string }) {
  return (
    <section className={`dashboard-table-section${className ? ` ${className}` : ""}`} aria-label={title}>
      <header className="dashboard-table-heading">
        <h2>{title}</h2>
      </header>
      <div className={tw("panel")}>
        <StaffHistoryEntries label={title} {...props} />
      </div>
    </section>
  );
}
