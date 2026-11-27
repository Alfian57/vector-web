"use client";

import { Search, X } from "lucide-react";
import type { DashboardSearchEntry, DashboardSearchKind } from "@/lib/domain";
import { DashboardSearchResult } from "./dashboard-search-result";
import { useDashboardGlobalSearch } from "./use-dashboard-global-search";
import type { DashboardSearchItem } from "./use-dashboard-global-search";
import { tw } from "@/lib/tw";

const searchGroupLabels: Record<DashboardSearchKind, string> = {
  report: "Laporan",
  plot: "Petak pantauan",
  alert: "Peringatan",
  "follow-up": "Tindak lanjut",
  "aid-allocation": "Alokasi bantuan",
  education: "Edukasi",
};

export function DashboardGlobalSearch({
  items,
  onSelectEntry,
}: {
  items: readonly DashboardSearchItem[];
  onSelectEntry?: (entry: DashboardSearchEntry) => boolean;
}) {
  const {
    dialogRef,
    inputRef,
    query,
    setQuery,
    matchingItems,
    entries,
    loading,
    issue,
    shouldSearch,
    openDialog,
    closeDialog,
  } = useDashboardGlobalSearch(items);
  const groupedEntries = new Map<DashboardSearchKind, DashboardSearchEntry[]>();
  for (const entry of entries) {
    const group = groupedEntries.get(entry.kind) ?? [];
    group.push(entry);
    groupedEntries.set(entry.kind, group);
  }

  return (
    <>
      <div
        className={tw(
          "relative mr-auto flex min-h-10 max-w-[470px] min-w-0 flex-1 items-center gap-[9px] rounded-lg border border-[#d4ddd0] bg-[#fffefb] px-2.5 text-[#66766a] focus-within:border-[#62835a] focus-within:shadow-[0_0_0_3px_#62835a20] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#62835a] max-[700px]:mr-0 max-[700px]:size-[38px] max-[700px]:flex-none max-[700px]:justify-center max-[700px]:p-0 [&_input]:absolute [&_input]:inset-0 [&_input]:z-[1] [&_input]:h-full [&_input]:w-full [&_input]:cursor-pointer [&_input]:rounded-lg [&_input]:border-0 [&_input]:bg-transparent [&_input]:outline-0 [&_input]:placeholder:opacity-0 [&_kbd]:rounded-[5px] [&_kbd]:border [&_kbd]:border-[#dce3d9] [&_kbd]:bg-[#f4f6f1] [&_kbd]:px-[6px] [&_kbd]:py-[3px] [&_kbd]:text-[.68rem] [&_kbd]:leading-[1.2] [&_kbd]:font-[600] max-[700px]:[&_kbd]:hidden max-[700px]:[&_span]:hidden",
        )}
      >
        <Search size={17} aria-hidden="true" />
        <span className={tw("min-w-0 flex-1 truncate text-[.84rem]")}>Cari menu atau data…</span>
        <kbd>Ctrl K</kbd>
        <label className={tw("sr-only")} htmlFor="dashboard-global-search-trigger">
          Cari menu dan fitur
        </label>
        <input
          id="dashboard-global-search-trigger"
          type="search"
          readOnly
          aria-haspopup="dialog"
          aria-controls="dashboard-global-search-dialog"
          aria-keyshortcuts="Control+K Meta+K"
          placeholder="Cari menu atau data…"
          onClick={openDialog}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openDialog();
            }
          }}
        />
      </div>
      <dialog
        id="dashboard-global-search-dialog"
        ref={dialogRef}
        className={tw(
          "m-auto max-h-[min(780px,82dvh)] w-[min(620px,calc(100vw_-_32px))] max-w-[620px] overflow-hidden rounded-[13px] border border-[#dce3d9] bg-[#fffefb] p-0 text-ink shadow-[0_22px_75px_#16291d38] backdrop:bg-[#16291d66] backdrop:backdrop-blur-[2px] max-[700px]:max-h-[88dvh]",
        )}
        aria-label="Pencarian menu dashboard"
        onClose={closeDialog}
        onCancel={closeDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div
          className={tw("grid max-h-[min(780px,82dvh)] grid-rows-[auto_minmax(0,1fr)_auto] max-[700px]:max-h-[88dvh]")}
        >
          <div
            className={tw(
              "flex min-h-[62px] items-center gap-[11px] border-b border-[#e5eae1] px-[15px] py-2.5 text-forest [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:py-[9px] [&_input]:text-[.96rem] [&_input]:text-ink [&_input]:outline-0 [&_input]:placeholder:text-[#87938a] [&_input]:placeholder:opacity-100 [&_input]:focus-visible:outline-0 [&:focus-within]:shadow-[inset_0_-2px_#62835a]",
            )}
          >
            <Search size={19} aria-hidden="true" />
            <label className={tw("sr-only")} htmlFor="dashboard-global-search-query">
              Cari menu atau data yang dapat diakses
            </label>
            <input
              ref={inputRef}
              id="dashboard-global-search-query"
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari menu, laporan, petak, peringatan, edukasi…"
            />
            <kbd className={tw("text-[.68rem] text-[#718075] max-[480px]:hidden")}>Esc</kbd>
            <button
              type="button"
              className={tw(
                "grid size-8 place-items-center rounded-md border-0 bg-transparent text-[#68776c] hover:bg-[#edf1e7] hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62835a]",
              )}
              aria-label="Tutup pencarian"
              onClick={closeDialog}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div
            className={tw(
              "max-h-[min(590px,65dvh)] min-h-[110px] overflow-y-auto overscroll-contain p-2.5 max-[700px]:max-h-[68dvh]",
            )}
          >
            <section aria-label="Menu dan fitur">
              <h2 className={tw("px-2.5 pt-1 pb-2 text-[.7rem] font-[720] text-[#78857b]")}>Menu dan fitur</h2>
              {matchingItems.length ? (
                <ul className={tw("m-0 grid list-none gap-0.5 p-0")}>
                  {matchingItems.map((item) => (
                    <li key={item.id}>
                      <DashboardSearchResult item={item} onActivate={closeDialog} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            {query.trim().length >= 2 && (
              <div aria-live="polite">
                {Array.from(groupedEntries, ([kind, group]) => (
                  <section key={kind} aria-label={searchGroupLabels[kind]}>
                    <h2 className={tw("px-2.5 pt-3 pb-2 text-[.7rem] font-[720] text-[#78857b]")}>
                      {searchGroupLabels[kind]}
                    </h2>
                    <ul className={tw("m-0 grid list-none gap-0.5 p-0")}>
                      {group.map((entry) => (
                        <li key={entry.id}>
                          <DashboardSearchResult
                            item={entry}
                            onActivate={closeDialog}
                            onSelectEntry={onSelectEntry ? () => onSelectEntry(entry) : undefined}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {loading && (
                  <p className={tw("px-3 py-5 text-center text-[.83rem] text-[#718075]")} role="status">
                    Mencari data sesuai hak akses akun…
                  </p>
                )}
                {issue && (
                  <p className={tw("px-3 py-5 text-center text-[.83rem] text-[#872d25]")} role="alert">
                    {issue}
                  </p>
                )}
                {shouldSearch && !loading && !issue && !matchingItems.length && !entries.length && (
                  <p className={tw("px-3 py-5 text-center text-[.83rem] text-[#718075]")} role="status">
                    Tidak ada menu atau data yang dapat diakses cocok dengan pencarian.
                  </p>
                )}
              </div>
            )}
            {query.trim().length < 2 && (
              <p className={tw("px-3 py-5 text-center text-[.83rem] text-[#718075]")}>
                Ketik sedikitnya 2 karakter untuk mencari data yang tersedia bagi role Anda.
              </p>
            )}
          </div>
          <footer
            className={tw(
              "flex justify-between gap-3 border-t border-[#e8ece3] px-[15px] py-2.5 text-[.69rem] text-[#7a877d] max-[480px]:text-[.65rem]",
            )}
          >
            <span>Data yang muncul mengikuti hak akses role Anda</span>
            <span className={tw("whitespace-nowrap")}>Ctrl K untuk membuka · Esc untuk menutup</span>
          </footer>
        </div>
      </dialog>
    </>
  );
}
