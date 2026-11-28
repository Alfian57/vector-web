import type { Metadata } from "next";
import { Suspense } from "react";
import { EducationContent } from "./education-content";
import { DashboardSkeleton } from "@/app/_components/dashboard-state";

export const metadata: Metadata = { title: "Edukasi tanaman · VEKTOR" };

export default function EducationPage({ searchParams }: PageProps<"/edukasi">) {
  return (
    <Suspense
      fallback={
        <main className="education-skeleton-page">
          <DashboardSkeleton label="Memuat panduan edukasi…" kind="education-list" />
        </main>
      }
    >
      <EducationContent searchParams={searchParams} />
    </Suspense>
  );
}
