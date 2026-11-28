import Link from "next/link";
import { educationPath } from "@/lib/routes";

const sections = [
  { href: "#tentang", label: "Tentang" },
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#faq", label: "Tanya jawab" },
] as const;

const linkClass =
  "inline-flex min-h-10 items-center whitespace-nowrap text-[.78rem] font-[570] text-muted hover:text-forest hover:underline hover:underline-offset-[5px] max-[360px]:col-span-2 max-[360px]:justify-center max-[360px]:nth-4:col-start-2 min-[400px]:text-sm min-[821px]:text-[.92rem]";

export function LandingNavigation({ label }: { label: string }) {
  return (
    <nav
      aria-label={label}
      className="flex min-w-0 flex-wrap items-center gap-x-[clamp(7px,2.5vw,16px)] gap-y-1 max-[360px]:grid max-[360px]:w-full max-[360px]:grid-cols-6 max-[360px]:gap-0 min-[821px]:gap-x-[clamp(16px,2vw,29px)]"
    >
      {sections.map(({ href, label: section }) => (
        <a className={linkClass} key={href} href={href}>
          {section}
        </a>
      ))}
      <Link className={linkClass} href={educationPath}>
        Edukasi
      </Link>
    </nav>
  );
}
