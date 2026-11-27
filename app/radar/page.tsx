import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "../_components/brand";
import { RadarContent } from "./radar-content";
import { tw } from "@/lib/tw";

export const metadata: Metadata = { title: "Radar Karawang · VEKTOR" };

export default function RadarPage() {
  return (
    <Suspense
      fallback={
        <main className={tw("auth-layout")}>
          <Brand />
          <p role="status">Memeriksa sesi akun…</p>
        </main>
      }
    >
      <RadarContent />
    </Suspense>
  );
}
