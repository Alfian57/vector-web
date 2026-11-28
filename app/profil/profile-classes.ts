import { tw } from "@/lib/tw";

export const profileStyles = {
  back: tw(
    "inline-flex items-center gap-[7px] rounded-[7px] border border-line bg-surface px-2 py-1 text-[.82rem] font-[640] text-forest no-underline hover:bg-(--dashboard-hover)",
  ),
  headingTitle: tw("text-ink"),
  headingDescription: tw("max-w-[68ch] text-[.91rem] leading-[1.55] text-muted"),
  sections: tw("grid grid-cols-[minmax(0,_1.15fr)_minmax(280px,_0.85fr)] items-stretch gap-3 max-[1020px]:grid-cols-1"),
  card: tw("min-w-0 rounded-[11px] border border-line bg-surface p-[clamp(12px,_1.5vw,_16px)]"),
  cardHeader: tw("mb-3 grid gap-1"),
  cardTitle: tw("text-[1.14rem] text-ink"),
  cardDescription: tw("text-[.82rem] leading-[1.5] text-muted"),
  avatarBlock: tw("mb-3 grid min-w-0 gap-2.5"),
  avatarIdentity: tw("flex min-w-0 items-center gap-3"),
  avatarActions: tw("grid min-w-0 justify-items-start gap-[7px]"),
  helper: tw("text-[.74rem] leading-[1.5] text-muted"),
  form: tw("grid gap-2.5 [&>button]:justify-self-end"),
  field: tw("grid gap-[6px] text-[.81rem] font-[630] text-ink"),
  fieldLabel: tw("text-[.81rem] font-[630] text-ink"),
  required: tw("font-[750] text-(--safety)"),
  input: tw(
    "min-h-(--dashboard-control-size) w-full rounded-[7px] border border-line bg-[#ffffff] px-2 py-1 text-[.88rem] font-normal text-ink focus-visible:border-forest focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-forest",
  ),
  passwordInput: tw(
    "min-h-(--dashboard-control-size) w-full rounded-[7px] border border-line bg-[#ffffff] px-2 py-1 pr-[43px] text-[.88rem] font-normal text-ink focus-visible:border-forest focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-forest",
  ),
  readOnly: tw("mt-3 grid grid-cols-2 gap-[9px] max-[480px]:grid-cols-1"),
  readOnlyItem: tw("grid min-w-0 gap-[3px]"),
  readOnlyLabel: tw("text-[.72rem] text-muted"),
  readOnlyValue: tw("text-[.79rem] font-[620] break-all text-ink"),
  button: tw(
    "inline-flex min-h-(--dashboard-control-size) w-fit items-center justify-center gap-2 rounded-[7px] border border-transparent bg-forest px-[9px] py-1 text-[.83rem] font-[660] text-white hover:bg-(--dashboard-forest-dark) disabled:cursor-default disabled:opacity-[.58]",
  ),
  feedback: tw(
    "mb-[13px] rounded-[7px] bg-(--dashboard-success-bg) px-3 py-[10px] text-[.82rem] leading-[1.45] text-(--dashboard-success)",
  ),
  feedbackError: tw("bg-(--dashboard-danger-bg) text-(--safety)"),
  passwordForm: tw("grid gap-2.5"),
  passwordActions: tw(
    "grid gap-[7px] [&_p]:text-[.74rem] [&_p]:leading-[1.45] [&_p]:text-muted [&>button]:justify-self-end",
  ),
  help: tw("text-[.78rem] font-normal text-muted"),
} as const;
