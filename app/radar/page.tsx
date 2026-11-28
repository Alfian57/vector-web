import type { Metadata } from "next";
import { RadarContent } from "./radar-content";

export const metadata: Metadata = { title: "Radar Karawang · VEKTOR" };

export default function RadarPage() {
  return <RadarContent screen={{ section: "radar" }} />;
}
