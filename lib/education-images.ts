import type { JSONContent } from "@tiptap/core";

const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const imagePath = new RegExp(`^/api/education/images/(${uuidPattern})$`, "i");
const pendingPath = new RegExp(`^pending-image:${uuidPattern}$`, "i");

export const educationImageAccept = "image/jpeg,image/png,image/webp";
export const educationImageTypes = new Set(educationImageAccept.split(","));
export const educationImageMaxBytes = 5_000_000;
export const educationImagesMaxTotalBytes = 20_000_000;
export const educationImagesMaxCount = 10;

export function educationImageSrc(id: string) {
  return `/api/education/images/${id}`;
}

export function educationImageId(source: string) {
  return imagePath.exec(source)?.[1]?.toLowerCase();
}

export function isPendingEducationImage(source: string) {
  return pendingPath.test(source);
}

export function* educationImageSources(document: JSONContent): Generator<string> {
  const source: unknown = document.attrs?.src;
  if (document.type === "image" && typeof source === "string") yield source;
  for (const child of document.content ?? []) yield* educationImageSources(child);
}

export function mapEducationImageSources(document: JSONContent, mapSource: (source: string) => string): JSONContent {
  const source: unknown = document.attrs?.src;
  if (document.type === "image" && typeof source === "string") {
    return { ...document, attrs: { ...document.attrs, src: mapSource(source) } };
  }
  return document.content
    ? { ...document, content: document.content.map((child) => mapEducationImageSources(child, mapSource)) }
    : document;
}
