import type { ReactNode } from "react";
import { tw } from "@/lib/tw";

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className={tw("field-label")}>
      {children}
      {required ? (
        <span className={tw("field-required")} aria-hidden="true">
          {" "}
          *
        </span>
      ) : (
        <span className={tw("field-optional")}> (opsional)</span>
      )}
    </span>
  );
}
