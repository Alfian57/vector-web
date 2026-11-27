import type { ReactNode } from "react";

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return <span className="field-label">
    {children}{required
      ? <span className="field-required" aria-hidden="true"> *</span>
      : <span className="field-optional"> (opsional)</span>}
  </span>;
}
