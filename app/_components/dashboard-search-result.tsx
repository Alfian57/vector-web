import Link from "next/link";
import { Bell, BookOpen, ClipboardList, MapPin, Megaphone, Package } from "lucide-react";
import type { DashboardSearchEntry } from "@/lib/domain";
import type { DashboardSearchItem } from "./use-dashboard-global-search";
import { tw } from "@/lib/tw";

const entryIcons = {
  report: ClipboardList,
  plot: MapPin,
  alert: Bell,
  "follow-up": Megaphone,
  "aid-allocation": Package,
  education: BookOpen,
} as const;

const entryLabels = {
  report: "Laporan",
  plot: "Petak pantauan",
  alert: "Peringatan",
  "follow-up": "Tindak lanjut",
  "aid-allocation": "Alokasi bantuan",
  education: "Edukasi",
} as const;

type SearchResultItem = DashboardSearchItem | DashboardSearchEntry;

export function DashboardSearchResult({
  item,
  onActivate,
  onSelectEntry,
}: {
  item: SearchResultItem;
  onActivate: () => void;
  onSelectEntry?: () => boolean;
}) {
  const { label, description, href } = item;
  const isEntry = "kind" in item;
  const Icon = isEntry ? entryIcons[item.kind] : item.icon;
  const onSelect = isEntry ? undefined : item.onSelect;
  const subtitle = isEntry ? `${entryLabels[item.kind]} · ${description}` : description;
  const content = (
    <>
      <span
        className={tw(
          "grid size-8 shrink-0 place-items-center rounded-[7px] border border-[#e4e9df] bg-[#fafbf7] text-[#587458]",
        )}
      >
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className={tw("grid min-w-0 gap-[3px]")}>
        <strong
          className={tw("overflow-hidden text-[.84rem] font-[660] text-ellipsis whitespace-nowrap text-[#304236]")}
        >
          {label}
        </strong>
        <small className={tw("overflow-hidden text-[.74rem] text-ellipsis whitespace-nowrap text-[#728075]")}>
          {subtitle}
        </small>
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={tw(
          "flex min-w-0 items-center gap-[11px] rounded-md border-l-[3px] border-transparent px-2.5 py-[9px] text-[#34483a] no-underline hover:border-l-[#52774c] hover:bg-[#f1f5ed] focus-visible:border-l-[#52774c] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#62835a]",
        )}
        onClick={(event) => {
          onActivate();
          if (onSelectEntry?.()) event.preventDefault();
        }}
      >
        {content}
      </Link>
    );
  }

  if (!onSelect) return null;

  return (
    <button
      type="button"
      className={tw(
        "flex w-full min-w-0 items-center gap-[11px] rounded-md border-l-[3px] border-transparent bg-transparent px-2.5 py-[9px] text-left text-[#34483a] hover:border-l-[#52774c] hover:bg-[#f1f5ed] focus-visible:border-l-[#52774c] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#62835a]",
      )}
      onClick={() => {
        onActivate();
        onSelect();
      }}
    >
      {content}
    </button>
  );
}
