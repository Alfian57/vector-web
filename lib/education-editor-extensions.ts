import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";

export const educationHeadingLevels = [1, 2, 3, 4, 5, 6] as const;

export const educationEditorExtensions = [
  StarterKit.configure({ link: false, heading: { levels: [...educationHeadingLevels] } }),
  TextStyle,
  FontFamily,
  Link.configure({ openOnClick: false, protocols: ["http", "https"] }),
  Image.configure({ allowBase64: false, inline: false }),
  Placeholder.configure({ placeholder: "Tuliskan panduan yang mudah diikuti petani…" }),
];
