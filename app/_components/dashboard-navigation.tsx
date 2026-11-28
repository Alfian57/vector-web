"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { isRouteWithin } from "@/lib/routes";

export type DashboardNavItem = {
  href: string;
  label: string;
  group: string;
  shortLabel?: string;
  icon: LucideIcon;
};

export function DashboardNavigation({
  label,
  root,
  items,
  documentLinks = false,
}: {
  label: string;
  root: string;
  items: readonly DashboardNavItem[];
  documentLinks?: boolean;
}) {
  const pathname = usePathname();
  const NavLink = documentLinks ? "a" : Link;
  const groups = items.reduce<Array<{ label: string; items: DashboardNavItem[] }>>((result, item) => {
    const lastGroup = result[result.length - 1];
    if (lastGroup?.label === item.group) {
      lastGroup.items.push(item);
    } else {
      result.push({ label: item.group, items: [item] });
    }
    return result;
  }, []);

  return (
    <nav className={`dashboard-nav${items.length === 3 ? " dashboard-nav--three" : ""}`} aria-label={label}>
      {groups.map(({ label: groupLabel, items: groupItems }, index) => (
        <Fragment key={`${groupLabel}-${index}`}>
          <span className="dashboard-nav-group-label" role="heading" aria-level={2}>
            {groupLabel}
          </span>
          {groupItems.map(({ href, label: text, shortLabel, icon: Icon }) => (
            <NavLink
              key={href}
              href={href}
              aria-label={text}
              aria-current={(href === root ? pathname === href : isRouteWithin(pathname, href)) ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className={shortLabel ? "dashboard-nav-desktop-label" : undefined}>{text}</span>
              {shortLabel && <span className="dashboard-nav-mobile-label">{shortLabel}</span>}
            </NavLink>
          ))}
        </Fragment>
      ))}
    </nav>
  );
}
