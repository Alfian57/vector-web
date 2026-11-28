export type QueryPatch = Readonly<Record<string, string | null | undefined>>;

export function parsePageIndex(value: string | null | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 0;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 10_000 ? page : 0;
}

export function pageQueryValue(page: number): string | null {
  return Number.isSafeInteger(page) && page > 0 && page <= 10_000 ? String(page) : null;
}

export function browserQueryHref(patch: QueryPatch): string {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function patchBrowserQuery(patch: QueryPatch, mode: "push" | "replace" = "push") {
  const href = browserQueryHref(patch);

  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (href === current) return href;

  if (mode === "replace") window.history.replaceState(window.history.state, "", href);
  else window.history.pushState(null, "", href);
  return href;
}

export function normalizeBrowserPage(key: string, rawValue: string | null, page: number) {
  const normalized = pageQueryValue(page);
  if (rawValue !== normalized) patchBrowserQuery({ [key]: normalized }, "replace");
}

export function dateOnlyToJakartaIso(value: string, edge: "start" | "end"): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const calendarDate = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.valueOf()) || calendarDate.toISOString().slice(0, 10) !== value) return undefined;
  const time = edge === "start" ? "00:00:00.000" : "23:59:59.999";
  const date = new Date(`${value}T${time}+07:00`);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : undefined;
}
