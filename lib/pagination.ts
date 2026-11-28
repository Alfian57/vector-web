export type PaginationItem = { type: "page"; page: number } | { type: "ellipsis"; key: string };

export const dashboardPageSize = 12;

export function paginationItems(page: number, totalPages: number | undefined, hasNext: boolean): PaginationItem[] {
  const pageCount = totalPages ?? page + 1 + Number(hasNext);
  if (pageCount <= 0) return [];

  const candidates =
    totalPages === undefined
      ? [0, 1, page - 1, page, page + 1]
      : [0, 1, page - 1, page, page + 1, pageCount - 2, pageCount - 1];
  const visiblePages =
    pageCount <= 7
      ? Array.from({ length: pageCount }, (_, index) => index)
      : [...new Set(candidates)]
          .filter((pageIndex) => pageIndex >= 0 && pageIndex < pageCount)
          .sort((first, second) => first - second);
  const items: PaginationItem[] = [];

  for (const [index, pageIndex] of visiblePages.entries()) {
    const previousPage = visiblePages[index - 1];
    if (previousPage !== undefined && pageIndex - previousPage > 1) {
      items.push({ type: "ellipsis", key: `${previousPage}-${pageIndex}` });
    }
    items.push({ type: "page", page: pageIndex });
  }

  return items;
}

export function paginationPageNumbers(page: number, totalPages: number | undefined, hasNext: boolean) {
  return paginationItems(page, totalPages, hasNext).flatMap((item) => (item.type === "page" ? [item.page] : []));
}
