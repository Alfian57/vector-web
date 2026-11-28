"use client";

import type { JSONContent } from "@tiptap/core";
import { useEffect, useRef } from "react";
import { jsonRequest } from "@/lib/client";
import {
  educationImageId,
  educationImageMaxBytes,
  educationImageTypes,
  educationImagesMaxCount,
  educationImagesMaxTotalBytes,
  mapEducationImageSources,
} from "@/lib/education-images";

type StagedImage = { file: Blob; reference: string };

export function articleImageIssue(file: Blob) {
  if (!educationImageTypes.has(file.type)) return "Gunakan gambar JPEG, PNG, atau WebP.";
  if (!file.size || file.size > educationImageMaxBytes) return "Pilih gambar dengan ukuran maksimal 5 MB.";
  return "";
}

export function useArticleImageDraft() {
  const stagedImages = useRef(new Map<string, StagedImage>());

  useEffect(() => {
    const images = stagedImages.current;
    return () => {
      for (const source of images.keys()) URL.revokeObjectURL(source);
      images.clear();
    };
  }, []);

  function stage(file: Blob) {
    const source = URL.createObjectURL(file);
    stagedImages.current.set(source, { file, reference: `pending-image:${crypto.randomUUID()}` });
    return source;
  }

  function discard(source: string) {
    if (stagedImages.current.delete(source)) URL.revokeObjectURL(source);
  }

  function prepare(
    method: "POST" | "PATCH",
    article: { title: string; category: string; summary: string; status: "draft" | "published"; content: JSONContent },
    thumbnailSrc: string | null,
  ) {
    const thumbnailIssue = "Gambar sampul tidak valid. Pilih kembali gambar.";
    const references = new Map<string, StagedImage>();
    function resolve(source: string, issue: string) {
      const staged = stagedImages.current.get(source);
      if (staged) {
        references.set(source, staged);
        return staged.reference;
      }
      if (educationImageId(source)) return source;
      throw new Error(issue);
    }
    const content = mapEducationImageSources(article.content, (source) =>
      resolve(source, "Gunakan tombol Sisipkan gambar untuk menambahkan gambar ke isi panduan."),
    );
    const thumbnail = thumbnailSrc ? resolve(thumbnailSrc, thumbnailIssue) : null;
    const payload = { ...article, content, thumbnailSrc: thumbnail };
    if (!references.size) return { request: jsonRequest(method, payload), references };

    const totalBytes = [...references.values()].reduce((total, { file }) => total + file.size, 0);
    if (references.size > educationImagesMaxCount || totalBytes > educationImagesMaxTotalBytes) {
      throw new Error("Simpan maksimal 10 gambar baru dengan total 20 MB sekaligus.");
    }
    const body = new FormData();
    body.set("article", JSON.stringify(payload));
    for (const { reference, file } of references.values()) body.set(`image:${reference}`, file);
    return { request: { method, body }, references };
  }

  function stageThumbnail(file: Blob, previous: string | null) {
    const issue = articleImageIssue(file);
    if (issue) throw new Error(issue);
    const source = stage(file);
    if (previous) discard(previous);
    return source;
  }

  return { stage, discard, prepare, stageThumbnail };
}
