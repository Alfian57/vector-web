import Link from "next/link";
import { homePath } from "@/lib/routes";
import { Radar } from "lucide-react";
import { tw } from "@/lib/tw";

export function Brand() {
  return (
    <Link href={homePath} className={tw("brand")} aria-label="VEKTOR, beranda">
      <span className={tw("brand-mark")}>
        <Radar size={25} strokeWidth={2.25} />
      </span>
      <span>
        <strong>VEKTOR</strong>
        <small>Radar hama tanaman</small>
      </span>
    </Link>
  );
}
