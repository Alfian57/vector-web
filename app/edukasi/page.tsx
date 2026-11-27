import type { Metadata } from "next";
import { Suspense } from "react";
import { EducationContent } from "./education-content";
import { tw } from "@/lib/tw";

export const metadata: Metadata = { title: "Edukasi tanaman · VEKTOR" };

export default function EducationPage({ searchParams }: PageProps<"/edukasi">) {
  return (
    <Suspense
      fallback={
        <main
          className={tw("mx-auto flex min-h-screen w-[min(calc(100%_-_2_*_clamp(16px,_5vw,_70px)),1080px)] flex-col")}
        >
          <p role="status">Memuat panduan edukasi…</p>
        </main>
      }
    >
      <EducationContent searchParams={searchParams} />
    </Suspense>
  );
}
