import { tw } from "@/lib/tw";

export const avatarStyles = {
  avatar: tw(
    "grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-full border border-[#ccd7c7] bg-[#e6eddd] text-[.76rem] font-[750] tracking-[.02em] text-forest max-[520px]:size-[35px]",
  ),
  avatarLarge: tw("size-11 text-[.88rem] max-[520px]:size-[35px]"),
  avatarProfile: tw("size-[76px] text-[1.15rem] max-[520px]:size-[76px]"),
} as const;
