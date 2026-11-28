import type { Metadata } from "next";
import { Suspense } from "react";
import { EducationArticleContent } from "./education-article-content";
import { DashboardSkeleton } from "@/app/_components/dashboard-state";

export const metadata: Metadata = { title: "Panduan tanaman · VEKTOR" };

export default function EducationArticlePage({ params }: PageProps<"/edukasi/[slug]">) {
  return (
    <Suspense
      fallback={
        <main className="education-skeleton-page">
          <DashboardSkeleton label="Memuat panduan…" kind="education-article" />
        </main>
      }
    >
      <EducationArticleContent params={params} />
    </Suspense>
  );
}
