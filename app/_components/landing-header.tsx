import Link from "next/link";
import { signInPath } from "@/lib/routes";
import { Brand } from "./brand";
import { LandingNavigation } from "./landing-navigation";

export function LandingHeader() {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 pt-3 pb-2 min-[821px]:grid-cols-[1fr_auto_1fr] min-[821px]:gap-3.5 min-[821px]:py-[22px]">
      <Brand />
      <div className="col-span-full row-start-2 min-[821px]:col-span-1 min-[821px]:col-start-2 min-[821px]:row-start-1">
        <LandingNavigation label="Navigasi beranda" />
      </div>
      <Link
        className="col-start-2 row-start-1 inline-flex min-h-[42px] w-fit items-center justify-center justify-self-end rounded-[7px] border border-line bg-surface px-5 py-[9px] text-[.87rem] leading-[1.25] font-[640] text-forest hover:bg-[#edf2e7] min-[821px]:col-start-3"
        href={signInPath}
      >
        Masuk
      </Link>
    </header>
  );
}
