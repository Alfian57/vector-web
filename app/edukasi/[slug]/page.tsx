import type { Metadata } from "next";
import { Suspense } from "react";
import { EducationArticleContent } from "./education-article-content";
import { tw } from "@/lib/tw";

export const metadata: Metadata = { title: "Panduan tanaman · VEKTOR" };

export default function EducationArticlePage({ params }: PageProps<"/edukasi/[slug]">) {
  return (
    <Suspense
      fallback={
        <main
          className={tw("mx-auto flex min-h-screen w-[min(calc(100%_-_2_*_clamp(16px,_5vw,_70px)),1080px)] flex-col")}
        >
          <p role="status">Memuat panduan…</p>
        </main>
      }
    >
      <EducationArticleContent params={params} />
    </Suspense>
  );
}
