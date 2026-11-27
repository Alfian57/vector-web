import { tw } from "@/lib/tw";

export const accountMenuStyles = {
  root: tw("relative z-[8] shrink-0"),
  trigger: tw(
    "inline-flex min-w-0 items-center gap-[9px] rounded-[10px] border border-transparent bg-transparent py-[5px] pr-[7px] pl-[5px] text-left text-ink hover:border-line hover:bg-surface focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#64862e] aria-expanded:border-line aria-expanded:bg-surface max-[520px]:gap-[7px] max-[520px]:px-[3px] max-[520px]:py-1",
  ),
  avatar: tw(
    "grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-full border border-[#ccd7c7] bg-[#e6eddd] text-[.76rem] font-[750] tracking-[.02em] text-forest max-[520px]:size-[35px]",
  ),
  avatarLarge: tw("size-11 text-[.88rem] max-[520px]:size-[35px]"),
  avatarProfile: tw("size-[76px] text-[1.15rem] max-[520px]:size-[76px]"),
  triggerCopy: tw("grid min-w-0 gap-[2px]"),
  triggerName: tw(
    "max-w-[min(220px,25vw)] overflow-hidden text-[.83rem] font-[680] text-ellipsis whitespace-nowrap max-[520px]:max-w-[35vw] max-[520px]:text-[.77rem]",
  ),
  triggerRole: tw("text-[.72rem] leading-[1.15] text-muted max-[520px]:text-[.68rem]"),
  chevron: tw("text-[#66766a] transition-transform motion-reduce:transition-none max-[520px]:w-[14px]"),
  chevronOpen: tw("rotate-180 text-[#66766a] transition-transform motion-reduce:transition-none max-[520px]:w-[14px]"),
  panel: tw(
    "absolute top-[calc(100%+9px)] right-0 w-[min(330px,calc(100vw_-_24px))] overflow-hidden rounded-[11px] border border-line bg-surface shadow-[0_15px_38px_#19352824] max-[520px]:right-[-3px]",
  ),
  identity: tw("flex items-center gap-[11px] p-4"),
  identityCopy: tw("grid min-w-0 gap-1"),
  identityName: tw("overflow-hidden text-[.92rem] text-ellipsis whitespace-nowrap"),
  identityRole: tw("text-[.78rem] text-muted"),
  contacts: tw("min-h-[62px] border-y border-line bg-[#f7f8f1] px-4 py-[10px]"),
  contact: tw("flex items-start gap-[9px] py-1 text-[.77rem] leading-[1.35] break-all text-muted"),
  contactIcon: tw("mt-px shrink-0 text-[#587458]"),
  contactStatus: tw("py-[13px]"),
  profileError: tw("flex min-h-[42px] items-center justify-between gap-[10px]"),
  profileErrorText: tw("text-[.76rem] text-[#872d25]"),
  retryButton: tw(
    "rounded-md border border-[#d2dbcd] bg-surface px-2 py-[5px] text-[.74rem] font-[650] text-forest focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#64862e]",
  ),
  actions: tw("grid gap-[3px] p-2"),
  action: tw(
    "flex min-h-10 w-full items-center gap-[10px] rounded-[7px] px-[10px] py-2 text-left text-[.83rem] font-[620] text-[#34483a] no-underline hover:bg-[#edf1e7] hover:text-forest focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#64862e]",
  ),
  dialog: tw(
    "m-auto w-[min(420px,calc(100vw_-_28px))] max-w-[420px] rounded-[13px] border border-line bg-surface p-0 text-ink shadow-[0_22px_70px_#16291d38] backdrop:bg-[#16291d66] backdrop:backdrop-blur-[2px]",
  ),
  dialogContent: tw("grid justify-items-start gap-3 p-[23px]"),
  dialogIcon: tw("grid size-[42px] place-items-center rounded-[11px] bg-[#e9efdf] text-forest"),
  logoutError: tw("w-full rounded-[7px] bg-[#f7e6df] px-[11px] py-[10px] text-[.81rem] text-[#872d25]"),
  dialogActions: tw("flex w-full justify-end gap-2 pt-1"),
  cancelButton: tw(
    "min-h-10 rounded-[7px] border border-line bg-surface px-[13px] py-2 text-[.83rem] font-[660] text-forest focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#64862e] disabled:cursor-default disabled:opacity-60",
  ),
  confirmButton: tw(
    "min-h-10 rounded-[7px] border border-[#8e2b23] bg-[#9e3329] px-[13px] py-2 text-[.83rem] font-[660] text-white focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#64862e] disabled:cursor-default disabled:opacity-60",
  ),
} as const;
