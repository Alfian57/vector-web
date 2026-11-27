import { type LucideIcon } from "lucide-react";
import { tw } from "@/lib/tw";

export function AdminStat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <article className={tw("admin-stat")}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <Icon size={13} aria-hidden="true" /> {note}
      </small>
    </article>
  );
}
