import Link from "next/link";
import { BookOpen, ClipboardList, MapPin, Megaphone, Package } from "lucide-react";
import type { DashboardSearchEntry } from "@/lib/domain";
import type { DashboardSearchItem } from "./use-dashboard-global-search";
import { isRouteWithin, radarPath } from "@/lib/routes";

const entryIcons = {
  report: ClipboardList,
  plot: MapPin,
  "follow-up": Megaphone,
  "aid-allocation": Package,
  education: BookOpen,
} as const;

const entryLabels = {
  report: "Laporan",
  plot: "Petak pantauan",
  "follow-up": "Tindak lanjut",
  "aid-allocation": "Alokasi bantuan",
  education: "Edukasi",
} as const;

type SearchResultItem = Pick<DashboardSearchItem, "label" | "icon" | "description" | "href"> | DashboardSearchEntry;

export function DashboardSearchResult({ item, onActivate }: { item: SearchResultItem; onActivate: () => void }) {
  const { label, description, href } = item;
  const isEntry = "kind" in item;
  const Icon = isEntry ? entryIcons[item.kind] : item.icon;
  const subtitle = isEntry ? `${entryLabels[item.kind]} · ${description}` : description;
  const ResultLink = isRouteWithin(href, radarPath) ? "a" : Link;
  return (
    <ResultLink href={href} className="dashboard-search-result" onClick={onActivate}>
      <span className="dashboard-search-icon">
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="dashboard-search-result-copy">
        <strong>{label}</strong>
        <small>{subtitle}</small>
      </span>
    </ResultLink>
  );
}
