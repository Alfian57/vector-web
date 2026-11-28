export const educationFontFamilies = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: '"Times New Roman", Times, serif', label: "Times New Roman" },
  { value: '"Courier New", Courier, monospace', label: "Courier New" },
] as const;

export const supportedEducationFontFamilies: ReadonlySet<string> = new Set(
  educationFontFamilies.map(({ value }) => value),
);
