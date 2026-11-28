import type { ReactNode } from "react";

type TableColumn = string | { label: string; numeric?: boolean };

export function DataTable({
  label,
  columns,
  children,
  busy = false,
}: {
  label: string;
  columns: readonly TableColumn[];
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <div
      className="dashboard-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="dashboard-data-table" aria-label={label} aria-busy={busy || undefined}>
        <thead>
          <tr>
            {columns.map((column) => {
              const header = typeof column === "string" ? { label: column } : column;
              return (
                <th key={header.label} scope="col" className={header.numeric ? "dashboard-table-number" : undefined}>
                  {header.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
