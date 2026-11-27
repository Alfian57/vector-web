import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { JSONContent } from "@tiptap/core";
import { educationEditorExtensions } from "@/lib/education-editor-extensions";

export function ArticleRichText({ content }: { content: Record<string, unknown> }) {
  return renderToReactElement({
    extensions: educationEditorExtensions,
    content: content as JSONContent,
  });
}
