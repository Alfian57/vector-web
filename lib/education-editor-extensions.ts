import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

export const educationEditorExtensions = [
  StarterKit.configure({ link: false }),
  Link.configure({ openOnClick: false, protocols: ["http", "https"] }),
  Image.configure({ allowBase64: false, inline: false }),
  Placeholder.configure({ placeholder: "Tuliskan panduan yang mudah diikuti petani…" }),
];
