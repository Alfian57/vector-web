import type { MetadataRoute } from "next";
import { homePath, radarPath } from "@/lib/routes";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VEKTOR — Radar Hama Tanaman",
    short_name: "VEKTOR",
    description: "Radar laporan dan pemantauan tanaman padi di Karawang.",
    lang: "id",
    id: homePath,
    scope: homePath,
    start_url: radarPath,
    display: "standalone",
    theme_color: "#143b2c",
    background_color: "#f4f5ec",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
