"use client";
import { tw } from "@/lib/tw";

export function HistoryPages({
  page,
  hasMore,
  onPage,
}: {
  page: number;
  hasMore?: boolean;
  onPage: (page: number) => void;
}) {
  if (!page && !hasMore) return null;
  return (
    <div className={tw("panel-note button-row action-row")}>
      <button type="button" className={tw("secondary")} disabled={!page} onClick={() => onPage(page - 1)}>
        Sebelumnya
      </button>
      <button type="button" className={tw("secondary")} disabled={!hasMore} onClick={() => onPage(page + 1)}>
        Berikutnya
      </button>
    </div>
  );
}
