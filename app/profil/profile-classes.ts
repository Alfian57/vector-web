import { tw } from "@/lib/tw";

export const profileStyles = {
  page: tw(
    "mx-auto grid min-h-screen w-full max-w-[1040px] content-start gap-[34px] p-[clamp(18px,_4vw,_42px)] max-[480px]:gap-6",
  ),
  header: tw("flex items-center justify-between gap-4"),
  back: tw(
    "inline-flex items-center gap-[7px] rounded-[7px] border border-line bg-surface px-[10px] py-2 text-[.82rem] font-[640] text-forest no-underline hover:bg-[#edf2e7]",
  ),
  main: tw("grid gap-[19px]"),
  heading: tw("grid gap-2"),
  headingTitle: tw("text-forest"),
  headingDescription: tw("max-w-[68ch] text-[.91rem] leading-[1.55] text-muted"),
  sections: tw(
    "grid grid-cols-[minmax(0,_1.15fr)_minmax(280px,_0.85fr)] items-start gap-[15px] max-[760px]:grid-cols-1",
  ),
  card: tw("min-w-0 rounded-[11px] border border-line bg-surface p-[clamp(17px,_2.5vw,_24px)]"),
  cardHeader: tw("mb-[18px] grid gap-[6px]"),
  cardTitle: tw("text-[1.14rem] text-forest"),
  cardDescription: tw("text-[.82rem] leading-[1.5] text-muted"),
  avatarBlock: tw(
    "mb-[19px] flex items-center gap-[15px] rounded-[9px] border border-[#e7ebe2] bg-[#fafbf7] p-[14px] max-[480px]:items-start",
  ),
  avatarActions: tw("grid justify-items-start gap-[7px]"),
  avatarTitle: tw("text-[.82rem] text-[#34483a]"),
  helper: tw("text-[.74rem] leading-[1.5] text-muted"),
  avatarButtons: tw("flex flex-wrap gap-[7px]"),
  avatarButton: tw(
    "min-h-[35px] rounded-md border border-line bg-white px-[10px] py-[6px] text-[.77rem] font-[650] text-forest hover:bg-[#edf2e7]",
  ),
  removeButton: tw("text-[#872d25]"),
  hiddenFile: tw("sr-only"),
  form: tw("grid gap-[13px] [&>button]:justify-self-end"),
  field: tw("grid gap-[6px] text-[.81rem] font-[630] text-[#34483a]"),
  fieldLabel: tw("text-[.81rem] font-[630] text-[#34483a]"),
  required: tw("font-[750] text-[#b3261e]"),
  input: tw(
    "min-h-[43px] w-full rounded-[7px] border border-[#cbd5c8] bg-[#fffefb] px-[11px] py-[9px] text-[.88rem] font-normal text-ink focus-visible:border-[#62835a] focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#64862e66]",
  ),
  passwordInput: tw(
    "min-h-[43px] w-full rounded-[7px] border border-[#cbd5c8] bg-[#fffefb] px-[11px] py-[9px] pr-[43px] text-[.88rem] font-normal text-ink focus-visible:border-[#62835a] focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#64862e66]",
  ),
  readOnly: tw("mt-[18px] grid grid-cols-2 gap-[9px] max-[480px]:grid-cols-1"),
  readOnlyItem: tw("grid min-w-0 gap-[5px] rounded-[7px] bg-[#f1f4eb] p-[11px]"),
  readOnlyLabel: tw("text-[.72rem] text-muted"),
  readOnlyValue: tw("text-[.79rem] font-[620] break-all text-[#34483a]"),
  button: tw(
    "inline-flex min-h-[41px] w-fit items-center justify-center gap-2 rounded-[7px] border border-transparent bg-forest px-[13px] py-[9px] text-[.83rem] font-[660] text-white hover:bg-[#24523c] disabled:cursor-default disabled:opacity-[.58]",
  ),
  feedback: tw("mb-[13px] rounded-[7px] bg-[#e9f0e1] px-3 py-[10px] text-[.82rem] leading-[1.45] text-[#36573c]"),
  feedbackError: tw("bg-[#f7e6df] text-[#872d25]"),
  passwordForm: tw("grid gap-3"),
  passwordActions: tw(
    "grid gap-[7px] [&_p]:text-[.74rem] [&_p]:leading-[1.45] [&_p]:text-muted [&>button]:justify-self-end",
  ),
  cropDialog: tw(
    "m-auto max-h-[min(90dvh,820px)] w-[min(550px,calc(100vw_-_24px))] max-w-[550px] overflow-auto rounded-[13px] border border-line bg-surface p-0 text-ink shadow-[0_22px_75px_#16291d38] backdrop:bg-[#16291d77] backdrop:backdrop-blur-[2px]",
  ),
  cropDialogInner: tw("grid gap-3 p-[clamp(15px,_4vw,_23px)]"),
  cropTitle: tw("text-[1.25rem] text-forest"),
  cropDescription: tw("text-[.82rem] leading-[1.5] text-muted"),
  cropArea: tw("relative h-[min(78vw,380px)] min-h-[250px] w-full overflow-hidden rounded-lg bg-[#243b30]"),
  cropControls: tw("grid grid-cols-[1fr_auto] items-center gap-x-[18px] gap-y-[11px] max-[480px]:grid-cols-1"),
  cropLabel: tw(
    "grid grid-cols-[auto_50px] gap-x-[10px] gap-y-1 text-[.79rem] font-[630] text-[#34483a] [&_input]:col-span-full [&_input]:w-full [&_input]:accent-forest [&_output]:text-right [&_output]:text-[.75rem] [&_output]:text-muted",
  ),
  rotateButtons: tw("flex gap-[6px] max-[480px]:justify-end"),
  rotateButton: tw(
    "grid size-[38px] place-items-center rounded-[7px] border border-line bg-white text-forest hover:bg-[#edf2e7]",
  ),
  cropActions: tw(
    "flex justify-end gap-2 pt-1 [&_button]:min-h-10 [&_button]:rounded-[7px] [&_button]:px-3 [&_button]:py-2 [&_button]:text-[.82rem] [&_button]:font-[660] [&_button]:disabled:cursor-default [&_button]:disabled:opacity-[.58]",
  ),
  cropCancel: tw("border border-line bg-white text-forest"),
  cropConfirm: tw("border border-transparent bg-forest text-white"),
  error: tw("text-[.79rem] text-[#872d25]"),
  help: tw("text-[.78rem] font-normal text-muted"),
} as const;
