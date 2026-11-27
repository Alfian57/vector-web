import { adminClasses } from "./tailwind/admin-classes";
import { coreClasses } from "./tailwind/core-classes";

export function tw(className: string | null | undefined) {
  if (!className) return "";

  return className
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((name) => {
      const classes = [coreClasses[name as keyof typeof coreClasses], adminClasses[name as keyof typeof adminClasses]];
      const mapped = classes.filter((value): value is string => typeof value === "string");
      return mapped.length ? mapped : [name];
    })
    .join(" ");
}
