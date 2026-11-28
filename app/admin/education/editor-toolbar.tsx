"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  RemoveFormatting,
  Strikethrough,
  Underline,
  type LucideIcon,
} from "lucide-react";
import type { MouseEvent } from "react";
import { educationHeadingLevels } from "@/lib/education-editor-extensions";
import { educationFontFamilies } from "@/lib/education-fonts";
import { tw } from "@/lib/tw";

function EditorTool({
  label,
  icon: Icon,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  pressed?: boolean;
  disabled: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

export function EducationEditorToolbar({
  editor,
  disabled,
  onInsertLink,
  onInsertImage,
}: {
  editor: Editor | null;
  disabled: boolean;
  onInsertLink: (trigger: HTMLButtonElement) => void;
  onInsertImage: () => void;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const heading = educationHeadingLevels.find((level) => current.isActive("heading", { level }));
      const blockStyle = current.isActive("blockquote") ? "quote" : heading ? String(heading) : "paragraph";
      const family: unknown = current.getAttributes("textStyle").fontFamily;
      return {
        blockStyle,
        font: educationFontFamilies.find(({ value }) => value === family)?.value ?? "",
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        link: current.isActive("link"),
        orderedList: current.isActive("orderedList"),
        bulletList: current.isActive("bulletList"),
        canIndent: current.can().sinkListItem("listItem"),
        canOutdent: current.can().liftListItem("listItem"),
      };
    },
  });
  const unavailable = disabled || !editor;

  function setBlockStyle(value: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "quote") {
      chain.setBlockquote().run();
      return;
    }
    if (editor.isActive("blockquote")) chain.unsetBlockquote();
    const level = educationHeadingLevels.find((heading) => String(heading) === value);
    if (level) chain.setHeading({ level }).run();
    else chain.setParagraph().run();
  }

  return (
    <div className={tw("dashboard-education-editor-toolbar")} role="group" aria-label="Pemformatan artikel">
      <div className={tw("dashboard-education-toolbar-row")}>
        <div className={tw("dashboard-education-toolbar-group")} role="group" aria-label="Gaya teks">
          <label className={tw("dashboard-education-toolbar-select dashboard-education-block-select")}>
            <select
              aria-label="Gaya paragraf"
              value={active?.blockStyle ?? "paragraph"}
              disabled={unavailable}
              onChange={(event) => setBlockStyle(event.currentTarget.value)}
            >
              <option value="paragraph">Paragraf</option>
              {educationHeadingLevels.map((level) => (
                <option key={level} value={level}>
                  Judul {level}
                </option>
              ))}
              <option value="quote">Kutipan</option>
            </select>
          </label>
          <label className={tw("dashboard-education-toolbar-select dashboard-education-font-select")}>
            <select
              aria-label="Jenis huruf"
              value={active?.font ?? ""}
              disabled={unavailable}
              onChange={(event) => {
                if (!editor) return;
                const font = educationFontFamilies.find(({ value }) => value === event.currentTarget.value);
                const chain = editor.chain().focus();
                if (font) chain.setFontFamily(font.value).run();
                else chain.unsetFontFamily().run();
              }}
            >
              <option value="">Bawaan artikel</option>
              {educationFontFamilies.map(({ value, label }) => (
                <option key={value} value={value} style={{ fontFamily: value }}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <span className={tw("dashboard-education-toolbar-divider")} aria-hidden="true" />
        <div className={tw("dashboard-education-toolbar-group")} role="group" aria-label="Format karakter">
          <EditorTool
            label="Tebal"
            icon={Bold}
            pressed={active?.bold ?? false}
            disabled={unavailable}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <EditorTool
            label="Miring"
            icon={Italic}
            pressed={active?.italic ?? false}
            disabled={unavailable}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <EditorTool
            label="Garis bawah"
            icon={Underline}
            pressed={active?.underline ?? false}
            disabled={unavailable}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          />
          <EditorTool
            label="Coret"
            icon={Strikethrough}
            pressed={active?.strike ?? false}
            disabled={unavailable}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          />
        </div>

        <span className={tw("dashboard-education-toolbar-divider")} aria-hidden="true" />
        <div className={tw("dashboard-education-toolbar-group")} role="group" aria-label="Daftar">
          <EditorTool
            label="Daftar bernomor"
            icon={ListOrdered}
            pressed={active?.orderedList ?? false}
            disabled={unavailable}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <EditorTool
            label="Daftar berpoin"
            icon={List}
            pressed={active?.bulletList ?? false}
            disabled={unavailable}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <EditorTool
            label="Kurangi inden daftar"
            icon={ListIndentDecrease}
            disabled={unavailable || !active?.canOutdent}
            onClick={() => editor?.chain().focus().liftListItem("listItem").run()}
          />
          <EditorTool
            label="Tambah inden daftar"
            icon={ListIndentIncrease}
            disabled={unavailable || !active?.canIndent}
            onClick={() => editor?.chain().focus().sinkListItem("listItem").run()}
          />
        </div>

        <span className={tw("dashboard-education-toolbar-divider")} aria-hidden="true" />
        <div
          className={tw("dashboard-education-toolbar-group")}
          role="group"
          aria-label="Sisipkan dan bersihkan format"
        >
          <EditorTool
            label={active?.link ? "Sunting tautan" : "Sisipkan tautan"}
            icon={Link2}
            disabled={unavailable}
            onClick={(event) => onInsertLink(event.currentTarget)}
          />
          <EditorTool label="Sisipkan gambar" icon={ImageIcon} disabled={unavailable} onClick={onInsertImage} />
          <EditorTool
            label="Hapus pemformatan"
            icon={RemoveFormatting}
            disabled={unavailable}
            onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
          />
        </div>
      </div>
    </div>
  );
}
