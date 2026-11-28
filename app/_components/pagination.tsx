"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { paginationItems } from "@/lib/pagination";

type PageHref = { page: number; href: string };

function neighborClassName(targetPage: number, page: number, totalPages?: number) {
  const hasNeighborPage = Math.abs(targetPage - page) === 1 && targetPage >= 2;
  const isBeforeLastTwo = totalPages === undefined || targetPage < totalPages - 2;
  return hasNeighborPage && isBeforeLastTwo ? " dashboard-pagination-page--neighbor" : "";
}

export function Pagination({
  page,
  hasNext,
  totalPages,
  busy = false,
  label,
  onPage,
  pageHrefs = [],
  className,
}: {
  page: number;
  hasNext: boolean;
  totalPages?: number;
  busy?: boolean;
  label: string;
  onPage?: (page: number) => void;
  pageHrefs?: readonly PageHref[];
  className?: string;
}) {
  const items = paginationItems(page, totalPages, hasNext);
  const hrefs = new Map(pageHrefs.map(({ page: pageIndex, href }) => [pageIndex, href]));
  const hasPrevious = page > 0;
  const canGoNext = totalPages === undefined ? hasNext : page < totalPages - 1;

  if (!hasPrevious && !canGoNext) return null;

  function pageControl(target: number, direction: "previous" | "next") {
    const previous = direction === "previous";
    const text = previous ? "Halaman sebelumnya" : "Halaman berikutnya";
    const Icon = previous ? ChevronLeft : ChevronRight;
    const enabled = previous ? hasPrevious : canGoNext;
    const href = hrefs.get(target);

    if (href && enabled && !busy) {
      return (
        <Link
          className="dashboard-pagination-page"
          href={href}
          prefetch={false}
          aria-label={text}
          title={text}
          key={direction}
        >
          <Icon size={17} aria-hidden="true" />
        </Link>
      );
    }

    return (
      <button
        type="button"
        className="dashboard-pagination-page"
        aria-label={text}
        title={text}
        disabled={!enabled || busy || !onPage}
        onClick={() => onPage?.(target)}
        key={direction}
      >
        <Icon size={17} aria-hidden="true" />
      </button>
    );
  }

  return (
    <nav
      className={`dashboard-pagination${className ? ` ${className}` : ""}`}
      aria-label={label}
      aria-busy={busy || undefined}
    >
      {pageControl(page - 1, "previous")}
      {items.map((item) => {
        if (item.type === "ellipsis") {
          return (
            <span key={item.key} className="dashboard-pagination-ellipsis" aria-hidden="true">
              …
            </span>
          );
        }

        if (item.page === page) {
          return (
            <span
              key={item.page}
              className="dashboard-pagination-page"
              aria-current="page"
              aria-label={`Halaman ${item.page + 1}, saat ini`}
            >
              {item.page + 1}
            </span>
          );
        }

        const href = hrefs.get(item.page);
        const className = `dashboard-pagination-page${neighborClassName(item.page, page, totalPages)}`;
        if (href && !busy) {
          return (
            <Link
              key={item.page}
              className={className}
              href={href}
              prefetch={false}
              aria-label={`Buka halaman ${item.page + 1}`}
            >
              {item.page + 1}
            </Link>
          );
        }

        return (
          <button
            key={item.page}
            type="button"
            className={className}
            aria-label={`Buka halaman ${item.page + 1}`}
            disabled={busy || !onPage}
            onClick={() => onPage?.(item.page)}
          >
            {item.page + 1}
          </button>
        );
      })}
      {pageControl(page + 1, "next")}
    </nav>
  );
}
